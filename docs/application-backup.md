# Encrypted application recovery package

The application-backup CLI combines a consistent encrypted SQLite snapshot with recovery files in one encrypted package. It is an offline operation: stop Shipyard and other writers to its persistent files before creating it. `--offline` acknowledges this prerequisite; it does not stop processes or prove that all external writers are stopped. Detected database changes or files changing during copying cause failure, but these checks do not replace a quiescent deployment.

The package discovers persistent data, configured playbooks/plugins/SSH/Git/state-backup directories, registered OpenTofu workspace paths and configured TLS files. Explicit configured paths and registered workspaces must exist. Missing optional default directories are recorded as absent. The source database and its WAL/SHM/journal files are excluded from file copies because the database has its own consistent snapshot.

The original `SHIPYARD_KEY_SECRET`, external `JWT_SECRET`, deployment configuration and remote workload backups remain separate recovery requirements. Generated secrets live in the separate `shipyard-secrets` volume (`/app/secrets/shipyard.env`) and are deliberately not part of the package. Remote VM disks, host applications and externally referenced files outside the discovered roots are not automatically captured. Inspect configured paths and the recovery manifest as part of recovery planning. Configured root paths may themselves be symbolic links: their contents are captured from the resolved target, and both configured and resolved paths are recorded. Retargeting a root during capture causes failure. Absolute or escaping links nested inside a source root are still refused; they are not silently followed. Prepared root contents are regular files/directories, so recreating the original deployment-level root links belongs in target-path review.

Run with the same path configuration as the stopped deployment and an existing private destination directory outside every source root. Provision enough free space for the prepared files, package and encrypted output. The CLI's temporary material is plaintext within private directories and is removed afterward; the published archive is encrypted and mode 0600. Existing archives are never overwritten.

```bash
read -rs -p 'Backup passphrase: ' SHIPYARD_BACKUP_PASSPHRASE
export SHIPYARD_BACKUP_PASSPHRASE
node server/cli/application-backup.js create /secure/backups/application.backup --offline
node server/cli/application-backup.js verify /secure/backups/application.backup
unset SHIPYARD_BACKUP_PASSPHRASE
```

Use `DB_PATH` for a nondefault database and preserve the deployment's `SHIPYARD_PLAYBOOKS_DIR`, `PLUGINS_DIR`, `SHIPYARD_SSH_DIR`, `SHIPYARD_GIT_WORKSPACE_DIR`, `TOFU_STATE_BACKUP_DIR`, `SSL_CERT` and `SSL_KEY` values where configured. The CLI opens the existing database read-only and does not initialize a new database.

Verification authenticates the entire encrypted package before processing its contents. It extracts only into a new private temporary directory, checks relative path/parent constraints and per-file SHA-256 hashes, and independently verifies the embedded encrypted SQLite archive. It never writes to the original paths recorded in manifests. Archives with escaping/duplicate paths, link parents, truncated data or altered contents are rejected. Overlapping roots and aliases (for example `data` and `data/ssh`) must contain identical copies of their shared physical source. Creation and verification compare shared contents, links and staging permissions; divergent copies are rejected even when each individual file checksum is valid. This catches changes between separate root copies but does not replace stopping all writers.

The format is specific to application packages; it is separate from the database-only archive format. The administration form currently exports database-only backups. Offline CLI activation and rollback are available below; full deployment recovery acceptance remains pending. A successful package verification proves archive consistency and embedded database integrity, not a successfully recovered deployment.


## Prepare an application restore

```bash
read -rs -p 'Backup passphrase: ' SHIPYARD_BACKUP_PASSPHRASE
export SHIPYARD_BACKUP_PASSPHRASE
node server/cli/application-backup.js restore /secure/backups/application.backup /secure/recovery/new-directory
unset SHIPYARD_BACKUP_PASSPHRASE
```

The destination must not exist and its parent must already exist. Restore authenticates the archive, reconciles both manifests with the actual package members and checks the database. It prepares:

- `database.db`: restored database with copied versioned sessions invalidated.
- `files/`: file roots and their original metadata manifest.
- `recovery-plan.json`: original source paths mapped to prepared relative paths, explicitly marked `prepared-not-activated`.
- `READY`: written only after preparation has completed successfully.

Existing destinations are refused. An ordinary failure removes a newly created partial recovery directory. After an interrupted process, a directory without `READY` is incomplete and must not be activated. Staging keeps restrictive owner permissions; original mode metadata remains available for review, but this is not an OS-level ownership/ACL/xattr backup.

Review each target path, the recorded application version and separately preserved keys/configuration before activation. No original path is overwritten automatically, no `DB_PATH` is changed and no application process or scheduler is started. Do not point a running production application at these files. Use the explicit staging/activation/rollback commands below only after target review; an isolated application recovery check remains required.

Creation verifies the finished encrypted application archive before publishing the destination file. This includes authenticated decryption, bundle/member checksums and manifest consistency, and verification of the embedded encrypted SQLite backup. A successful create result includes `verified: true`; failed verification leaves no published destination. Verification requires additional temporary space for the decrypted bundle and extracted contents. Verify a copied/downloaded archive again before recovery, since later transfer or storage damage is outside the creation check.

## Verify prepared recovery files

Before activation, keep writers stopped and compare the prepared directory against its original encrypted archive:

```bash
node server/cli/application-backup.js verify-prepared /secure/backups/application.backup /secure/recovery/new-directory
```

Supply `SHIPYARD_BACKUP_PASSPHRASE` as for restore. This command builds a fresh private temporary restore from the authenticated archive and compares the prepared database, file roots, recovery plan, READY marker, links and restrictive staging permissions. It rejects missing, extra or changed members. The prepared directory is only read; it is never repaired, overwritten or activated. The temporary comparison is removed afterward, and needs space for an additional restore. Success reports `preparedVerified: true`, `restored: false`, `activated: false`.

This is a point-in-time comparison, not a lock against later changes, a check of separately preserved deployment secrets, or proof that the restored application can run. A legitimate modification to prepared files requires review and will fail this exact comparison. Activation/rollback remains separate work.

## Check the separately preserved application key

With `SHIPYARD_BACKUP_PASSPHRASE` and the original `SHIPYARD_KEY_SECRET` supplied through the environment, run:

```bash
node server/cli/application-backup.js verify-key /secure/backups/application.backup
```

The archive is authenticated first. The command checks AES-GCM authentication for encrypted `.enc` files in the included managed `ssh` recovery root and for encrypted core database values in settings, Ansible variables, schedule extra variables and active/pending user TOTP secrets. It opens only the temporary archived database, read-only, and prints counts and a result rather than decrypted values. A wrong key, mixed-key values or damaged ciphertext fails the command. `keyVerified: false` with zero checked database values and SSH files means the archive provides no evidence for the supplied key; it is not a positive verification.

The result reports `sshRootIncluded` and `checkedSshFiles` separately. Missing SSH roots provide no SSH-file evidence. This check does not validate encrypted files outside the managed SSH root, plugin-specific encryption, SSH key syntax or usability, external JWT configuration or access to remote workloads. It is one recovery prerequisite, not an application activation or complete recovery acceptance test. Neither secret belongs in command-line arguments or shared logs.

## Review activation destinations

The activation planner is read-only. It verifies the prepared directory against the authenticated archive again, requires an explicit destination for every included root, and consolidates nested/aliased roots only when their original relationships agree. A database located inside a file-root destination is listed as an overlay in that root's operation. Overwriting another archived file, the prepared directory, the source archive or following target symlinks is refused.

Create a JSON mapping with `database` set to its absolute destination file and `roots` mapping each included root ID from `recovery-plan.json` to its absolute destination. Omit absent roots. Map physical paths as visible to the recovery process: Docker container paths and host volume paths are not interchangeable. The plan does not stop containers, rewrite mounts or establish that a mountpoint can be replaced.

```bash
read -rs -p 'Backup passphrase: ' SHIPYARD_BACKUP_PASSPHRASE
export SHIPYARD_BACKUP_PASSPHRASE
node server/cli/recovery-activation.js plan /secure/backups/application.backup /secure/recovery/new-directory /secure/recovery/targets.json
unset SHIPYARD_BACKUP_PASSPHRASE
```

The result is `planned-not-activated`. Review each operation's source, target, covered roots and database overlay. No destination files are created or changed. Staging, activation and rollback are separate commands below; a valid plan is not an activated recovery or a guarantee of runtime readiness.

## Stage activation payloads beside their targets

After reviewing the destination mapping, stop application and filesystem writers and run:

```bash
read -rs -p 'Backup passphrase: ' SHIPYARD_BACKUP_PASSPHRASE
export SHIPYARD_BACKUP_PASSPHRASE
node server/cli/recovery-activation.js stage /secure/backups/application.backup /secure/recovery/new-directory /secure/recovery/targets.json /secure/recovery/new-activation-journal --offline
unset SHIPYARD_BACKUP_PASSPHRASE
```

The journal directory must not exist and must be separate from the prepared directory and activation targets. Target parent directories must already exist at physical paths. Staging allocates private `.shipyard-activation-*` sibling directories on each target filesystem. It copies and compares the verified payload, adds the database overlay where planned, synchronizes file/directory contents, and writes progress through an atomically replaced journal. The prepared recovery is checked against the archive again before the final `staged-not-activated` state. Existing target files/directories are not replaced or removed.

The result gives the journal path. Preserve that directory and the listed staging directories. Ordinary copy failures remove only newly created staging material; cleanup failures report the journal to preserve. After a process or machine interruption, do not assume staging completed based on directory existence. Use cleanup-staging below for an interrupted preparation. Interrupted target switching can be rolled back with the command below. Staging alone does not switch a deployment, prove the original encryption key is usable, or validate runtime recovery. The `--offline` flag is an operator acknowledgement, not process detection.


## Activate or roll back a staged recovery

Run the operator entry point `server/cli/recovery-activation.js` on the same recovery host for all commands, including cleanup-staging. It uses util-linux `flock` on the host root-directory inode to serialize recovery commands within that filesystem namespace, without creating a lock/PID file. A conflicting command exits with code 75. The lock is released when the actual worker exits, including after termination. This is not a distributed lock across different hosts or container filesystem namespaces; do not run concurrent recovery operations against shared volumes from those locations. The internal worker and service functions are not operator entry points.

Keep writers stopped, preserve the archive/prepared directory/target mapping, and supply the original application key for activation. Missing or nonmatching keys fail before any target is moved. Archives without encrypted values report no positive key evidence. External deployment secrets, workload data and runtime readiness still require separate verification.

```bash
read -rs -p 'Backup passphrase: ' SHIPYARD_BACKUP_PASSPHRASE
export SHIPYARD_BACKUP_PASSPHRASE
read -rs -p 'Original application key: ' SHIPYARD_KEY_SECRET
export SHIPYARD_KEY_SECRET
node server/cli/recovery-activation.js activate /secure/backups/application.backup /secure/recovery/new-directory /secure/recovery/targets.json /secure/recovery/activation-journal --offline
unset SHIPYARD_BACKUP_PASSPHRASE SHIPYARD_KEY_SECRET
```

The journal must come from completed staging. Activation verifies payloads again, preserves each original under its staging directory's `previous` path and installs the recovered payload. An ordinary failure attempts rollback. A process interruption may leave some targets switched and others pending: keep the application stopped and use rollback. A successful `activated:true` means the filesystem switch completed; it does not mean a service was started or tested.

```bash
read -rs -p 'Backup passphrase: ' SHIPYARD_BACKUP_PASSPHRASE
export SHIPYARD_BACKUP_PASSPHRASE
node server/cli/recovery-activation.js rollback /secure/backups/application.backup /secure/recovery/new-directory /secure/recovery/targets.json /secure/recovery/activation-journal --offline
unset SHIPYARD_BACKUP_PASSPHRASE
```

Rollback checks the preserved originals and target identities, restores originals and retains withdrawn recovered data under `withdrawn`. Unexpected target replacements are refused for manual review. The original application key is not required to restore retained original files, but the authenticated archive and unchanged prepared recovery remain required to validate the journal's target mapping. Preserve the journal and all staging directories through runtime acceptance; there is no automatic deletion of the old deployment. Staging and switching now reject targets that are mountpoints or contain nested mounts using Linux mountinfo, including bind mounts. Run against the physical storage paths from the recovery host. An isolated full-route application probe covers login, old-session rejection, host inventory, decrypted configuration, playbook reads and rollback; external workloads and background runners are not exercised by that probe.


## Clean an interrupted preparation

Keep the deployment stopped and use the original archive, unchanged prepared directory and target mapping:

```bash
read -rs -p 'Backup passphrase: ' SHIPYARD_BACKUP_PASSPHRASE
export SHIPYARD_BACKUP_PASSPHRASE
node server/cli/recovery-activation.js cleanup-staging /secure/backups/application.backup /secure/recovery/new-directory /secure/recovery/targets.json /secure/recovery/activation-journal --offline
unset SHIPYARD_BACKUP_PASSPHRASE
```

The command applies only to preparation/cleanup states, including completed staging that has never been activated. It validates mappings against the authenticated archive, requires original target identities to remain unchanged and checks ownership markers in nonempty staging directories. It refuses activation/rollback history, preserved originals and unrecognized entries. Payloads are deleted before ownership markers, allowing another cleanup attempt after interruption during deletion. The journal remains with `staging-cleaned`; create a new journal directory when staging again.

Do not use cleanup-staging to remove `previous` or `withdrawn` data after activation/rollback. Missing or invalid ownership evidence in a nonempty directory requires manual review; older staging directories without ownership markers are deliberately not treated as disposable. Tests cover separate-process exits during both preparation and cleanup, repeat cleanup and preservation of original targets/history.

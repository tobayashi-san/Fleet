# Encrypted database backups

This is the database portion of Shipyard recovery. It is not a full system backup or an automated application recovery workflow.

The snapshot includes every SQLite table across all environments, including users, configuration, inventory, history and database-stored credentials. SQLite's online backup API includes committed WAL data in a consistent snapshot. Creation checks SQLite integrity before encrypting the snapshot with AES-256-GCM and a random salt/nonce; the passphrase key is derived with scrypt. Verification authenticates the archive before checking the extracted database. Existing destination files are never overwritten.

Preserve these separately:

- The original `SHIPYARD_KEY_SECRET`, needed to decrypt application secrets after recovery. The backup passphrase does not replace it. When Shipyard generated it, it is in `/app/secrets/shipyard.env` in the `shipyard-secrets` volume.
- The deployment configuration and any externally configured JWT secret.
- User playbooks, plugins, Git workspace and infrastructure state files/directories, including paths configured outside the default data volume.
- Remote hosts, VMs, disks and application data. A Shipyard database backup does not back them up.

Administrators can also create and download an encrypted database archive from Administration → Danger Zone. The export requires the current account password and, when enabled, a current authenticator code. Confirm that the scope includes all environments. The server keeps only a temporary archive for transfer; it does not retain a managed backup after download. Verify and store the downloaded file separately.

Run from the repository root on the application host with its installed Node dependencies. Use an absolute output filename in an existing private directory with enough free space for both the SQLite snapshot and encrypted archive. No production backup is created merely by installing this code.

```bash
read -rs -p 'Backup passphrase: ' SHIPYARD_BACKUP_PASSPHRASE
export SHIPYARD_BACKUP_PASSPHRASE
node server/cli/database-backup.js create /secure/backups/shipyard-db.backup
unset SHIPYARD_BACKUP_PASSPHRASE
```

Set `DB_PATH` when the deployment uses a nondefault database location. The CLI opens the database read-only. The passphrase must contain at least 12 characters and at most 1024 UTF-8 bytes; keep it separately in a password manager. It is passed through the environment, not a command-line argument. Output contains only scope, integrity, counts and size, not database values or passphrases.

Verify the archive with the same passphrase:

```bash
read -rs -p 'Backup passphrase: ' SHIPYARD_BACKUP_PASSPHRASE
export SHIPYARD_BACKUP_PASSPHRASE
node server/cli/database-backup.js verify /secure/backups/shipyard-db.backup
unset SHIPYARD_BACKUP_PASSPHRASE
```

Verification decrypts into a private temporary directory and removes it afterward. The archive and temporary snapshot use restrictive filesystem permissions. Temporary plaintext can exist while creation/verification runs; use trusted local storage and account permissions. A successful integrity check proves archive authentication and SQLite structural integrity, not full application recovery or availability of the separate files/keys listed above.

## Restore into a new database file

The restore command authenticates and verifies the archive, then publishes a new database file. It refuses to overwrite any existing destination, including symlinks, and refuses destinations with existing SQLite sidecar files. The source database and archive are unchanged. Restored versioned login tokens are invalidated by advancing each user's token version; tracked sessions and pending MFA-enrollment secrets are removed. Users must sign in again.

```bash
read -rs -p 'Backup passphrase: ' SHIPYARD_BACKUP_PASSPHRASE
export SHIPYARD_BACKUP_PASSPHRASE
node server/cli/database-backup.js restore /secure/backups/shipyard-db.backup /secure/recovery/restored.db
unset SHIPYARD_BACKUP_PASSPHRASE
```

Use an existing private recovery directory with sufficient free space. The output is a plaintext SQLite database protected by filesystem permissions; the archive remains encrypted. This command does not change `DB_PATH`, stop/start Shipyard or activate the restored database.

Before application recovery, preserve the current deployment, stop application writers and restore the required files and original encryption key separately. Validate with the matching Shipyard version in an isolated recovery environment. Restored schedules and integration settings retain their saved values, so do not start a second connected scheduler against production systems during verification. Never replace a running application's database or mix it with old WAL/SHM files.

Full filesystem packaging, coordinated activation/rollback, retention, restore UI, backup requirements before resets and end-to-end recovery acceptance remain pending.

## Recovery verification coverage

Automated tests restore the real Shipyard schema into a separate process, retain records across two environments and an admin role, decrypt a stored setting with the original application key, reject an old tracked HTTP/WebSocket session, and complete a fresh password-plus-MFA login. The wrong application key cannot decrypt the setting or complete MFA. These tests use synthetic data and authentication modules only; they do not start schedulers or establish host connections and do not constitute full deployment recovery acceptance.

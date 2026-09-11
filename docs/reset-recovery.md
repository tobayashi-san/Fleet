# Reset failure handling

Every reset requires an authenticated administrator, the exact confirmation phrase and scope, the current account password, and an authenticator code when MFA is enabled. Password attempts share the existing ten-per-hour reset limit. Account and tracked-session state are rechecked after the asynchronous password comparison. The form clears password/code after every attempt or cancellation.

Host, schedule and account resets group their database changes and audit entry in a SQLite transaction. Failed writes roll back together. Schedule reset unregisters cron tasks after commit; queued callbacks check that their schedule still exists and is enabled. Already running work is not cancelled.

Playbook reset and combined reset use the configured `SHIPYARD_PLAYBOOKS_DIR` (default `server/playbooks`). They remove root-level `.yml`/`.yaml` user files; bundled playbooks, nested directories and other file types remain. Linked playbook files and directories named like playbooks are refused before mutation. The runner, playbook API and Git synchronization use the same configured root.

Before committing database changes, selected playbooks are moved into a private, mode-0700 `.shipyard-reset-*` directory within that root. A normal staging or database failure restores the moved files without overwriting independently created replacements. On success, staged files are removed. If that cleanup fails after commit, the API returns success with a warning; the settings page displays the warning instead of inviting a destructive retry. Server logs identify the staging directory.

Combined reset includes hosts and related caches/history, schedules and their history, operation acknowledgements, accounts, shared user playbooks and authentication/appearance settings. It is not a full database wipe. Environments, other inventories/integrations and audit records can remain.

## Interrupted process or incomplete rollback

New staged resets write a private journal before moving any playbooks and synchronize the journal and directory changes. It records filenames, SHA-256 hashes and a persistent database identity. A matching journal hash is stored in the same SQLite transaction as the reset. This distinguishes committed resets from interrupted uncommitted work after a process exit. The application refuses another playbook/combined reset while a staging directory remains.

Stop the application and all external filesystem writers, preserve the original database and staging directory, then run:

```sh
node server/cli/reset-recovery.js /absolute/original-database /absolute/playbooks --offline
```

`--offline` is an explicit precondition; the CLI does not stop processes or discover external writers. Use the original current database, not an older backup. A different database identity or a changed committed journal is rejected. An older copy of the same database can share its identity, so selecting the original current database remains essential.

- Without a commit marker, staged files are restored after checking their recorded hashes. Existing replacement files are preserved and reported as conflicts. A recovery interrupted between linking and unlinking can resume when both names refer to the same inode.
- With a matching commit marker, only staged remnants are cleaned up. Reset data and playbooks are not recreated.
- The journal is removed after the staged files, so a cleanup interrupted earlier remains classifiable. An empty staging directory left at the final step can be removed on retry.
- Missing/invalid journals from older versions, changed files and conflicts require manual review. Preserve these directories; do not blindly delete them or retry the destructive reset. Move conflicting replacements aside only after reviewing their content, then rerun recovery.

Process-exit cases before commit, after commit and during final cleanup are covered by separate-process tests. This is not a claim of atomicity across power failure, damaged storage, concurrent external writers or replacement of the database with an older copy. Full application recovery remains separate.

Binding destructive actions to a recent verified backup and complete application activation/rollback remain open requirements.

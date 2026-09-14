# Documentation

## Installation and operations

- [Docker deployment](DOCKER_DEPLOYMENT.md) — installation, network binding,
  TLS, persistent storage, and updates.
- [MFA policy](mfa-policy.md) — enrollment requirements and authentication policy.
- [SSH key import](ssh-key-import.md) — importing and reviewing credentials.
- [Audit log](audit-log.md) — event visibility, filtering, exports, and retention.

## Backup and recovery

- [Database backup](database-backup.md) — encrypted database-only exports,
  verification, and database recovery.
- [Application backup](application-backup.md) — offline encrypted packages,
  included files, restore staging, activation, rollback, and validation limits.
- [Reset recovery](reset-recovery.md) — reset prerequisites, confirmation,
  recovery procedures, and failure handling.

A database export is not a full deployment backup. Preserve deployment secrets
separately and read the application guide for excluded data and the remaining
end-to-end recovery acceptance requirements.

## Development and extensions

- [Local setup](DEVELOPMENT_PIPELINE.md#local-development) — dependencies and development servers.
- [Development pipeline](DEVELOPMENT_PIPELINE.md) — targeted checks, CI gates,
  release candidates, and stable releases.
- [Plugin template](../plugin-template/README.md) — plugin structure, APIs,
  permissions, and trust configuration.

## Historical review records

- [Review closure matrix](ui-review-closure.md) — September 2026 findings,
  implementation evidence, and acceptance limits.
- [Implementation log](ui-review-implementation.md) — chronological work record.

These are dated engineering records, not current operator instructions. Their
evidence links are pinned to commit
`0e6490dfb646cce5a05dfda54755f0feaa3635f6`, before generated review files were
removed from the tracked tree. Browse the
[September 9 evidence](https://github.com/tobayashi-san/Shipyard/tree/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09)
and [September 10 evidence](https://github.com/tobayashi-san/Shipyard/tree/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-10).
GitHub displays HTML files as source; download the corresponding review archive
to inspect its HTML pages locally. Unlinked `verification/...` filenames in the
records refer to the September 9 evidence directory.

New screenshots, generated fixtures, and review archives go in ignored
`artifacts/` or CI artifacts. Keep reusable automated tests in `server/test/`,
frontend source tests, or `frontend-next/e2e/`. Removing generated files from the
tracked tree does not remove earlier versions from Git history or reduce the
size of existing full clones.

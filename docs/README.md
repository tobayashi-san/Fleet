# Documentation

## Installation and operations

- [Docker deployment](DOCKER_DEPLOYMENT.md) — installation, network binding,
  TLS, persistent storage, and updates.
- [MFA policy](mfa-policy.md) — enrollment requirements and authentication policy.
- [SSH key import](ssh-key-import.md) — importing and reviewing credentials.
- [Audit log](audit-log.md) — event visibility, filtering, exports, and retention.

## Upgrading from Shipyard

- [Migrating from Shipyard](MIGRATING_FROM_SHIPYARD.md) — one-time move of an
  existing Shipyard installation to Fleet.

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

## Test and review artifacts

New screenshots, generated fixtures, and review archives belong in ignored
`artifacts/` or CI artifacts. Keep reusable tests in `server/test/`, frontend
source tests, or `frontend-next/e2e/`.

## Repository contributions

- [Contributing](../CONTRIBUTING.md): development conventions and validation.
- [Security policy](../SECURITY.md): private vulnerability reporting guidance.

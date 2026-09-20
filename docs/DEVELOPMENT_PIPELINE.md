# Shipyard Development Pipeline

This document defines how changes move from local development to a published
Shipyard release.

## Runtime and local setup

Use Node.js 24 for local development and CI; the root `.nvmrc` records this
version. Follow the local setup below to install all three packages and load
the development environment.

The Dockerfile pins Node.js 24 images by digest for its build and runtime
stages, matching the major version in CI, `.nvmrc`, and package `engines`.
Runtime upgrades must update both stages and validate native SQLite installation,
the frontend build, and container startup/restart checks before publication.

After building a candidate image, run the disposable-container checks:

```bash
docker build -t shipyard:config-check .
node tools/test-container.mjs shipyard:config-check
# With Podman: CONTAINER_ENGINE=podman node tools/test-container.mjs <image>
```

These checks cover failed configuration, non-root startup, legacy-file archival,
workspace ownership boundaries, restart stability, and certificate renewal.
They use test credentials and anonymous container storage and remove their
containers and anonymous volumes on completion.

Generated UI-review evidence belongs in ignored `artifacts/` or CI artifacts.
See the [documentation index](README.md#test-and-review-artifacts) for artifact
storage conventions.

## Local development

Install Node.js 24 and npm. Git, OpenSSL, OpenSSH client tools, and Ansible are
needed for their corresponding host-management features. Building the native
SQLite dependency from source also requires Python 3, Make, and a C/C++ toolchain.

Run these commands from the repository root:

```bash
npm ci
npm --prefix server ci
npm --prefix frontend-next ci
```

Create a private `.env` with both secrets using the
[first-install instructions](../README.md#2-create-your-configuration). Keep an
existing development `.env` rather than overwriting it. Local Node processes do
not automatically load this file; in Bash, load your own trusted configuration
before starting both development servers:

```bash
set -a
. ./.env
set +a
npm run dev
```

Open **http://localhost:5174**. Vite proxies API and WebSocket requests to the
backend on port 3001. Local development uses HTTP unless you configure backend
TLS variables; the production Docker deployment uses HTTPS by default.

```bash
# Install browser and OS dependencies once
npm --prefix frontend-next exec -- playwright install --with-deps firefox

# From the repository root: all backend and frontend checks, including browser tests
npm run check
```

CI and release workflows use the same `check` scripts as local development.
Browser runs use separate temporary databases and result directories; use
`FLEET_E2E_API_PORT` and `FLEET_E2E_WEB_PORT` for concurrent runs. Explicit
screenshots live under `FLEET_E2E_ARTIFACT_DIR` (a unique temporary directory by
default). Playwright prints the result path on failure.

The root `npm run dev:server` and `npm --prefix server run dev` use the same
backend command.

## Development Flow

1. Create a feature or fix branch from the latest `main`.
2. Make the smallest coherent change and keep public API or schema changes
   explicit in the PR description.
3. Run local checks before opening the PR:
   - Backend changes: `npm run check:backend`
   - One backend test file: `cd server && node --test test/<file>.test.js`
   - Frontend changes: `npm run check:frontend`
   - Browser workflows: install both backend and frontend dependencies, then run
     `cd frontend-next && npm run test:e2e`.
   - Cross-cutting changes: run `npm run check` from the repository root.
4. Open a pull request into `main`.
5. Merge only after the GitHub CI workflow is green.

`main` is expected to stay release-ready. Direct commits to `main` should be
reserved for urgent fixes and must still pass the same checks.

## CI Gates

The `CI` workflow runs on pull requests and pushes to `main`.

- Backend checks install `server` dependencies with `npm ci`, type-check the
  guarded OpenTofu core modules, and run `npm test`.
- Frontend checks install `frontend-next` dependencies with `npm ci`, then run the
  build, type checker, linter, and unit tests.
- Browser tests install the backend dependencies required by their local API
  server, install Firefox, and run the Playwright suite.
- Production dependencies are audited for both applications.
- Docker validation builds and loads the production image without pushing it,
  starts the container, verifies its HTTPS health endpoint, restarts it, and
  verifies that it becomes healthy again.

There is no repo-wide formatter gate. Frontend ESLint is a required gate.

## Release Flow

Shipyard uses release candidates first.

1. Merge the release content into `main`.
2. Start the `Release` workflow manually.
3. Enter a version without a leading `v`:
   - RC: `1.1.2-rc.1`
   - Stable: `1.1.2`
4. The workflow verifies that it was dispatched from `main`, validates the
   version, runs backend, frontend, browser, audit, and Docker build gates.
5. If all gates pass, the workflow updates all package versions, commits the
   version bump, creates an annotated tag, and creates a GitHub Release.
6. The workflow starts `Build and Push Docker Image` for the new tag, which
   publishes the container image to GHCR.

Stable releases use the `stable-release` GitHub Environment. Configure that
environment in GitHub with a required reviewer so stable publication pauses for
manual approval. RC releases do not require this stable approval.

## Version and Image Rules

- Version files must stay synchronized:
  - `package.json`
  - `package-lock.json`
  - `server/package.json`
  - `server/package-lock.json`
  - `frontend-next/package.json`
  - `frontend-next/package-lock.json`
- The release workflow updates those files with `tools/set-version.mjs`.
- Tags always use a leading `v`, for example `v1.1.2-rc.1`.
- Stable Docker tags publish:
  - `ghcr.io/tobayashi-san/shipyard:<version>`
  - `ghcr.io/tobayashi-san/shipyard:<major>.<minor>`
  - `ghcr.io/tobayashi-san/shipyard:latest`
- RC Docker tags publish only the explicit RC version tag and must not move
  `latest`.

## Acceptance Checks

Before treating a release as usable:

- Confirm the `Release` workflow completed successfully.
- Confirm the tag/ref-triggered `Build and Push Docker Image` workflow completed
  successfully.
- For RCs, test the explicit RC image tag with Docker Compose.
- For stable releases, confirm `latest` points to the new stable release.

## Browser failure evidence

CI, release verification and image publishing upload a `browser-failure-*`
artifact when a job fails after producing browser evidence. It contains the
Playwright HTML report, failed-test screenshots and retained traces, plus
explicit UI screenshots. Artifacts are retained for 14 days; no test databases
or runtime workspaces are uploaded.

`FLEET_E2E_OUTPUT_DIR` selects Playwright's result directory and
`FLEET_E2E_REPORT_DIR` selects the CI HTML report directory. Local runs still use
unique temporary result directories by default. For concurrent runs, use
separate output directories if overriding them, as well as separate API/web ports.

The navigation suite uses default Playwright test mode: a failed case does not
skip later cases. Tests establish their own session and prerequisites. One
worker is retained because browser tests share an isolated API database.

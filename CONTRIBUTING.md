# Contributing to Fleet

Use Node.js 24 (see `.nvmrc`). Start with the setup and release instructions in
[Development Pipeline](docs/DEVELOPMENT_PIPELINE.md).

## Changes

- Create a focused branch from `main` and open a pull request.
- Keep UI copy in English and use existing components and permission checks.
- Preserve environment and host scope in API queries, mutations and background work.
- Put feature logic in `server/features/` or `frontend-next/src/features/`;
  keep route modules focused on composition and access control.
- Include a database migration when persistent data changes. Explain recovery
  implications and compatibility with existing installations.
- Add behavior tests for bugs and consequential changes. Prefer observable
  requests, permissions and UI behavior over source-text assertions.

## Verification

Install dependencies in all three packages:

```sh
npm ci
npm --prefix server ci
npm --prefix frontend-next ci
npm --prefix frontend-next exec -- playwright install --with-deps firefox
npm run check
```

The common check runs backend tests and type checks, frontend type checks and
lint, unit tests, browser tests and the production build. CI also audits
packages and checks the production container.

For focused work, use `npm run check:backend` or run individual Vitest/Playwright
files from `frontend-next`. Browser tests use temporary databases and one worker;
individual tests must create their prerequisites and clean up owned resources.
Do not use serial suites merely to share login state.

Failed CI browser runs provide a `browser-failure-*` artifact with screenshots,
traces and an HTML report. Download it and open `report/index.html`, or use
`npx playwright show-trace <trace.zip>` from `frontend-next`.

Do not commit generated browser evidence, local databases, secrets or `.env`
files. Describe the result, validation and any limitations in the pull request.
See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

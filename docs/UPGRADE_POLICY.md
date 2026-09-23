# Upgrade and support policy

This page explains what a Fleet version number promises, which releases
receive fixes, and how to upgrade and verify an image safely.

## Versions

Fleet uses [semantic versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

| Release | What it contains | What you need to do |
| --- | --- | --- |
| **Patch** (`3.1.0` → `3.1.1`) | Bug and security fixes only | Pull and restart |
| **Minor** (`3.1` → `3.2`) | New or refined features; database migrations run automatically | Read the changelog, back up, pull and restart |
| **Major** (`3` → `4`) | Changes that need action from you | Follow the upgrade notes in the changelog before pulling |

A release that requires manual steps lists them under **Breaking changes** in
the [changelog](../CHANGELOG.md), even when the version number alone would not
suggest it.

**Release candidates** (`3.2.0-rc.1`) are for testing. They receive explicit
tags only, never replace `latest`, and may change before the stable release.
Do not run them on an installation you depend on.

## Image tags

| Tag | Moves to |
| --- | --- |
| `latest` | Every stable release |
| `3.1` | Every patch release of 3.1 |
| `3.1.0` | Never; it always refers to the same image |
| `3.1.0-rc.1` | Never; release candidates only |

For production, pin a minor tag (`3.1`) to receive patches without new
features, or a full version (`3.1.0`) to change nothing without deciding to.
Set it in `.env`:

```bash
FLEET_IMAGE=ghcr.io/tobayashi-san/fleet:3.1
```

Images are published for `linux/amd64` and `linux/arm64`.

## Supported releases

Fixes, including security fixes, are released as a new version from the
current development line. Earlier releases are not patched separately:
upgrade to the newest release to receive a fix. The [security
policy](../SECURITY.md) explains how to report a vulnerability.

## Upgrading

1. Read the changelog entries between your version and the target version.
2. Create an application backup from **Settings → Advanced → Application export
   and restore** and store it outside the Docker host.
3. Pull and restart from your Fleet directory:

   ```bash
   docker compose pull
   docker compose up -d --wait
   ```

Database migrations run on start. Skipping minor versions is supported within
the same major version: upgrade from `3.0.x` directly to `3.3.x`. To cross a
major version, upgrade to the newest release of your current major version
first.

Never run `docker compose down -v` during an upgrade. It deletes the volumes
holding your data and generated secrets.

## Downgrading

Migrations only move forward, so an older image cannot open a database that a
newer version has already migrated. To return to an earlier version, restore
the backup you took before upgrading with that earlier version's image.

## Verifying images

Each published image is signed with [Sigstore cosign](https://docs.sigstore.dev/)
from the release workflow, without a long-lived key. Verify that an image was
built by this repository before running it:

```bash
cosign verify ghcr.io/tobayashi-san/fleet:3.1.0 \
  --certificate-identity-regexp '^https://github\.com/tobayashi-san/Fleet/\.github/workflows/docker-publish\.yml@refs/tags/v' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

Each image also carries a software bill of materials (SBOM) and build
provenance. Inspect them with Docker Buildx:

```bash
docker buildx imagetools inspect ghcr.io/tobayashi-san/fleet:3.1.0 --format '{{ json .SBOM }}'
docker buildx imagetools inspect ghcr.io/tobayashi-san/fleet:3.1.0 --format '{{ json .Provenance }}'
```

Before publishing, every image is scanned for known vulnerabilities. A release
is blocked while a critical or high vulnerability with an available fix
remains.

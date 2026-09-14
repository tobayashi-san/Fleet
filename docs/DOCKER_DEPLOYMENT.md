# Docker deployment

Shipyard manages SSH credentials and can run automation on your hosts. Deploy
it only on a trusted network: behind a VPN, a firewall, or a reverse proxy.
Do not publish its port directly to the public internet.

## Quick start

Use the version-controlled `docker-compose.yml` and create a private `.env`
file next to it:

```bash
git clone https://github.com/tobayashi-san/Shipyard.git
cd Shipyard
cp .env.example .env
chmod 600 .env
```

Generate both secrets and insert them in `.env`. They must be different:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Set the first value as `JWT_SECRET` and the second as
`SHIPYARD_KEY_SECRET`. Keep `SHIPYARD_KEY_SECRET` for the lifetime of the
installation; it encrypts stored SSH keys, tokens, and TOTP secrets.

Start and wait for the health check:

```bash
docker compose pull
docker compose up -d --wait
docker compose ps
```

The default binding is `127.0.0.1:443`, so Shipyard is accessible only from
the Docker host or a reverse proxy on that host. Open
`https://localhost` and complete onboarding. Shipyard creates a self-signed
certificate on its first start.

## Network and TLS

For direct access from a protected LAN, set an explicit private host address
in `.env`, for example:

```dotenv
SHIPYARD_BIND_ADDRESS=10.20.1.10
CERT_SANS=IP:10.20.1.10,DNS:shipyard.example.internal
```

Never use `0.0.0.0` unless an external firewall strictly limits access. For a
reverse proxy, keep the localhost binding and configure the proxy to terminate
TLS. Mount a certificate and key read-only when Shipyard should serve your own
certificate directly:

```yaml
volumes:
  - /etc/ssl/certs/shipyard.crt:/certs/shipyard.crt:ro
  - /etc/ssl/private/shipyard.key:/certs/shipyard.key:ro
environment:
  - SSL_CERT=/certs/shipyard.crt
  - SSL_KEY=/certs/shipyard.key
  - ALLOWED_ORIGINS=https://shipyard.example.internal
  - TRUST_PROXY=1 # only when a trusted reverse proxy is in front of Shipyard
```

`CERT_SANS` is especially important for agent push mode: managed hosts must be
able to verify Shipyard's certificate name or IP address.

### Renewing a generated certificate

Changing `CERT_SANS` does not silently replace an existing certificate. To
explicitly renew Shipyard's generated certificate, set the new `CERT_SANS` and
`SHIPYARD_RENEW_CERT=1` in `.env`, then run `docker compose up -d --wait`.
After successful renewal, set `SHIPYARD_RENEW_CERT=0` and run the same command
again. Leaving renewal enabled would generate a new key on every container start.

The previous generated key/certificate pair is retained under
`/app/server/data/certs/previous.*`. A failed generation leaves the current
pair intact. Renewal changes the self-signed certificate's identity: update
browser and managed-agent trust as needed. Old certificates without SANs,
expired certificates, and incomplete or mismatched pairs stop startup with a
diagnostic instead of being silently replaced.

Custom certificates are never renewed by this setting. Set both `SSL_CERT` and
`SSL_KEY`, mount the files read-only, and make them readable by container UID
1001. Setting only one path or combining custom TLS with generated-certificate
renewal stops startup.

### Runtime settings

The supplied Compose file forwards MFA policy, both SSH terminal time limits,
plugin trust policy/digests, and the renewal flag from `.env` to the application.
Changes require `docker compose up -d --wait` to recreate the container; a plain
restart does not reload its environment. `.env.example` lists these settings.
Compose uses `.env` for interpolation, not as an automatic container env file.
Additional application variables require explicit `environment` entries.

Startup repairs ownership of `/workspaces` by default. For custom container
paths, mount the directories and explicitly set `OPENTOFU_WORKSPACE_ROOTS` in
the service environment to their comma-separated absolute paths. Use dedicated
paths such as `/mnt/shipyard-workspaces`; system paths are rejected. Symlinks
inside a workspace are not followed during recursive ownership repair. The old
application-written `tofu-workspace-paths.txt` is no longer used for root-level
ownership changes.

## Persistent data and backups

The named `shipyard-data` volume contains the SQLite database, TLS material,
encrypted secrets, SSH keys, and the OpenTofu binary installed from the
Deployments page (`bin/tofu`). OpenTofu deployment files and state are kept in
the separate `shipyard-workspaces` volume. The container automatically repairs
workspace ownership on startup, including when `/workspaces` is replaced with
a writable bind mount. The local `./playbooks` and `./plugins` directories are
also mounted and should be backed up if you customize them.

On upgrades, obsolete `/app/plugins/opentofu` and the old user-mounted
`playbooks/system` directory are moved into
`/app/server/data/legacy-migrations/startup.*`. Their contents are preserved for
manual inspection and recovery rather than deleted. Do not copy an obsolete
plugin back into the active plugin directory; restore only reviewed custom
content. These archives are part of the data volume and should be included in
its backup.

Shipyard also provides [encrypted database exports](database-backup.md) and an
[offline application recovery package](application-backup.md). Database exports
do not include all deployment files. Preserve the original deployment secrets
separately and consult the recovery guide for package coverage and activation
limits. The volume command below archives only `shipyard-data`; workspaces,
custom playbooks, plugins, and external configuration need separate coverage.

For a consistent volume backup, stop Shipyard first, then archive the named
volume. Replace `shipyard_shipyard-data` with the volume name shown by
`docker volume ls` if your Compose project has another name.

```bash
docker compose stop
docker run --rm \
  -v shipyard_shipyard-data:/data:ro \
  -v "$PWD":/backup \
  alpine:3.21 tar -C /data -czf /backup/shipyard-data-$(date +%F).tgz .
docker compose start
```

Protect the backup like a secret: it contains encrypted data and the key
material needed to decrypt it. Test a restore on a non-production host before
depending on a backup.

## Updating

Pin a release tag in `.env` for predictable production updates:

```dotenv
SHIPYARD_IMAGE=ghcr.io/tobayashi-san/shipyard:3.0
```

After taking a backup, update with:

```bash
docker compose pull
docker compose up -d --wait
docker image prune -f
```

The named data volume is preserved. Do not use `docker compose down -v` unless
you intentionally want to delete all Shipyard data.

## Security properties of the supplied Compose stack

- No privileged mode or host Docker socket is mounted.
- The image initializes data as root only when needed, then runs the server as
  the unprivileged `shipyard` user.
- `no-new-privileges` prevents child processes from gaining extra privileges.
- Docker's local log driver limits each container log to three 10 MB files.
- Secrets stay in the ignored, mode-600 `.env` file; `.env.example` contains
  only empty placeholders.

Validate the final configuration before starting it:

```bash
docker compose config --quiet
```

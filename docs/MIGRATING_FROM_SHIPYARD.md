# Migrating from Shipyard to Fleet

Shipyard is now called **Fleet**. The rename is a clean break: environment
variables, Docker volumes, the image, the database file and the secrets file
all use the new name, and Fleet does not read the old names. An existing
Shipyard installation therefore needs this one-time migration before it runs
the Fleet image.

Plan about 15 minutes of downtime. Nothing on your managed hosts changes.

## What changes

| Shipyard | Fleet |
| --- | --- |
| Image `ghcr.io/tobayashi-san/shipyard` | `ghcr.io/tobayashi-san/fleet` |
| Environment variables `SHIPYARD_*` | `FLEET_*` |
| Volumes `shipyard-data`, `shipyard-secrets`, `shipyard-workspaces` | `fleet-data`, `fleet-secrets`, `fleet-workspaces` |
| Database `shipyard.db` | `fleet.db` |
| Secrets file `shipyard.env` with `SHIPYARD_KEY_SECRET` | `fleet.env` with `FLEET_KEY_SECRET` |

## Before you start

1. Create a database backup from **Settings → Advanced → Application export and restore**
   and store it outside the Docker host.
2. Copy your existing `.env` somewhere safe. It contains `SHIPYARD_KEY_SECRET`
   if you set the key yourself.
3. Note the names of your volumes. Docker Compose prefixes them with the
   project directory, for example `shipyard_shipyard-data`:

   ```bash
   docker volume ls | grep shipyard
   ```

## Migrate

Run these steps on the Docker host. Replace `shipyard_` in the volume names if
your project directory had a different name.

1. **Stop Shipyard.** Do not use `-v`; it would delete the volumes.

   ```bash
   cd ~/shipyard   # your existing directory
   docker compose down
   ```

2. **Create the Fleet directory and configuration.**

   ```bash
   mkdir ~/fleet && cd ~/fleet
   curl -fsSLO https://raw.githubusercontent.com/tobayashi-san/Fleet/main/docker-compose.yml
   # Only when you had a .env: carry it over with the new variable names.
   sed -e 's/^SHIPYARD_/FLEET_/' -e 's#tobayashi-san/shipyard#tobayashi-san/fleet#' ~/shipyard/.env > .env
   chmod 600 .env
   ```

   If you had custom playbooks in `~/shipyard/playbooks`, copy them too:
   `cp -a ~/shipyard/playbooks ~/fleet/`.

3. **Copy the volumes.** The old volumes stay untouched as a fallback.

   ```bash
   for name in data secrets workspaces; do
     docker volume create --label com.docker.compose.project=fleet \
       --label com.docker.compose.volume="fleet-$name" "fleet_fleet-$name"
     docker run --rm -v "shipyard_shipyard-$name:/from:ro" -v "fleet_fleet-$name:/to" \
       alpine sh -c 'cp -a /from/. /to/'
   done
   ```

4. **Rename the database and the secrets file.**

   ```bash
   docker run --rm -v fleet_fleet-data:/data alpine sh -c \
     'cd /data && for f in shipyard.db shipyard.db-wal shipyard.db-shm; do [ -e "$f" ] && mv "$f" "fleet${f#shipyard}"; done; ls fleet.db*'
   docker run --rm -v fleet_fleet-secrets:/secrets alpine sh -c \
     '[ ! -e /secrets/shipyard.env ] || { sed "s/^SHIPYARD_KEY_SECRET=/FLEET_KEY_SECRET=/" /secrets/shipyard.env > /secrets/fleet.env && chmod 600 /secrets/fleet.env && rm /secrets/shipyard.env; }'
   ```

   The secrets file only exists when Shipyard generated its secrets. When you
   set them in `.env`, step 2 already renamed them.

5. **Start Fleet.**

   ```bash
   docker compose up -d --wait
   docker compose logs --tail=30 fleet
   ```

   If the log reports `Existing data found, but FLEET_KEY_SECRET is missing`,
   the key did not come across. Check step 2 or step 4; never let Fleet
   generate a new key for existing data.

## After the migration

- **Sign in again.** Browser sessions and the chosen theme are stored under
  the old name and start fresh.
- **Create a new backup.** Application backups made by Shipyard use the old
  format and cannot be restored by Fleet.
- **Deployed VMs stay managed.** Fleet recognizes the `Shipyard VM <id>`
  description on existing Proxmox VMs. The next apply of a deployment updates
  the description to `Fleet VM <id>` in place; nothing is recreated.
- **OpenTofu workspaces:** Fleet writes its managed outputs in a block marked
  `BEGIN FLEET MANAGED OUTPUT` and saves plans under `.fleet/plans`. Remove the
  old `BEGIN SHIPYARD MANAGED OUTPUT` block from each workspace once Fleet has
  regenerated its own, and delete any leftover `.shipyard/` directory.
- **Host agents:** agents installed by Shipyard run as `shipyard-agent` from
  `/etc/shipyard`. Remove them on each host (`systemctl disable --now
  shipyard-agent`, then delete `/etc/systemd/system/shipyard-agent.service`,
  `/etc/shipyard`, `/var/lib/shipyard-agent` and the `shipyard-agent` user) and
  install the agent again from the host's page in Fleet.
- **Clean up** when Fleet runs as expected:

  ```bash
  docker volume rm shipyard_shipyard-data shipyard_shipyard-secrets shipyard_shipyard-workspaces
  docker image rm ghcr.io/tobayashi-san/shipyard:latest
  ```

## Rolling back

The Shipyard volumes are unchanged until you remove them. To go back, stop
Fleet (`docker compose down` in `~/fleet`) and start Shipyard again from
`~/shipyard`.

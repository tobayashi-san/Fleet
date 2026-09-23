# Changelog

All notable changes to Fleet are listed here. Fleet follows
[semantic versioning](https://semver.org/); see the
[upgrade and support policy](docs/UPGRADE_POLICY.md) for what each kind of
release means for your installation.

The release workflow publishes the section that matches the released version
as its GitHub release notes. Release candidates use the section of the version
they lead up to.

## 3.2.0

### Added

- Workflow variables per deployment: set values in the VM form that its pre-
  and post-deploy workflows receive, for example the firewall alias for a new
  host. VM templates carry them too, and the deployment view lists them.

### Changed

- Variables & Secrets and Git are regular tabs under Automations instead of
  entries in a menu.

## 3.1.0

### Breaking changes

- **Shipyard is now Fleet.** The image, environment variables, Docker volumes,
  database file and secrets file use the new name, and Fleet does not read the
  old names. Existing installations migrate once with the
  [migration guide](docs/MIGRATING_FROM_SHIPYARD.md) before pulling the new
  image. Application backups made by Shipyard cannot be restored by Fleet.
  VMs deployed by Shipyard remain managed; host agents need to be reinstalled.
- **Maintenance windows are removed.** Jobs and updates run when you start or
  schedule them; existing window definitions are dropped during the upgrade.

### Added

- Updates dashboard with separate Hosts, Packages and History views, bulk
  update and reboot actions, and a history of past update runs.
- Start page that shows what needs attention, including pending updates,
  recent activity and quick actions for the current environment.
- Fleet light and dark themes as the default, plus Enterprise light and dark
  themes.
- Container images for `linux/arm64` in addition to `linux/amd64`.
- Signed images with an SBOM and build provenance; see
  [verifying images](docs/UPGRADE_POLICY.md#verifying-images).

### Changed

- Installation generates `JWT_SECRET` and `FLEET_KEY_SECRET` on first start
  and keeps them in a separate `fleet-secrets` volume, so a `.env` file is
  optional.
- Hosts and deployments are separate: the Hosts list focuses on inventory and
  health, while provisioning resumes safely after interruptions.
- Infrastructure navigation, automations, networks, jobs and settings share
  one tab style and clearer, sentence-case wording.
- Networks show prefix usage and offer a global IPAM search; Proxmox IPAM data
  reconciles with Fleet's records.
- Jobs show per-host results and name manual runs after their playbook.
- The help menu shows the running version and links to the documentation and
  changelog.
- Errors without a server message explain the likely cause, for example an
  unreachable server or a restarting proxy, instead of a bare status code.

### Fixed

- Tables no longer show a stray `0` for hosts without a flag.
- Notifications no longer cover dialog buttons.
- Failed queries show an error instead of an empty list.
- Playbook synchronization reports a non-file entry instead of copying it as
  an empty playbook.
- Colour contrast meets WCAG AA in every theme.
- Icon-only buttons have accessible names for screen readers.

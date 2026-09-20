# Security policy

## Reporting a vulnerability

Please do not publish credentials, working exploits or details of an unpatched
vulnerability in a public issue or pull request.

If GitHub offers **Report a vulnerability** in this repository's Security tab,
use that private reporting flow. Otherwise, contact the repository maintainer
privately through an available contact channel. If no private channel is
available, open an issue requesting a private reporting channel without
including vulnerability details.

Include the affected version or commit, deployment configuration with secrets
removed, reproduction steps, expected and actual behavior, and the impact you
observed. Use a local or otherwise explicitly authorized test installation.

## Fixes and updates

Security fixes target the current development branch and the newest applicable
release. Older installations may need to upgrade; backports and response times
are not guaranteed. Release candidates are intended for testing and may change
before a stable release.

Never attach production databases, private keys, access tokens, unredacted logs
or browser traces containing real credentials to public reports. CI browser
artifacts must come from isolated test environments with test-only credentials.

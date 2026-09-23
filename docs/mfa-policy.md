# Mandatory MFA

Set `FLEET_MFA_POLICY` in the server environment and restart the service:

- `optional` (default): users may enable MFA individually.
- `admins`: administrator accounts must use MFA.
- `all`: every account must use MFA.

An unrecognized nonempty value enforces `all`; it never silently disables enforcement. The policy is deployment configuration, not currently editable in the settings UI. Existing authentication remains unchanged when the variable is omitted.

An affected account without MFA receives a ten-minute enrollment token after password verification. This token permits only MFA status, setup, confirmation and logout. All other protected APIs and WebSockets reject it. The enrollment page shows an authenticator QR code and requires a valid six-digit TOTP before issuing a normal session. Once issued, an enrollment token remains restricted even if the policy is subsequently relaxed. Users can resume an expired enrollment by signing in again. Reopening unfinished setup preserves its pending authenticator key, so an already scanned entry remains usable.

Existing password-only sessions are also checked against the current policy. Unenrolled users are directed to enrollment; accounts with MFA must sign in again if their old token does not record second-factor verification. There is no grace period. Enabling MFA rotates the account token version, invalidating prior sessions.

Users covered by the policy cannot disable their own factor through the self-service API. Administrators retain the audited account recovery action to clear a user's factor; that account must enroll again before accessing the workspace. Protect administrator access accordingly. If all administrator authenticators are lost, the server operator can temporarily set the policy to `optional`, restart, and use the existing authorized account-recovery procedure; changing policy does not by itself remove an existing authenticator or bypass its login challenge.

This release uses authenticator-app TOTP. It does not add SSO, recovery codes, security keys, a grace period or a browser editor for deployment policy. Do not activate production policy until the enrollment path and administrator recovery procedure have been verified for that deployment.

# Audit history and export

Role, administrator account, host and SSH key replacement mutations store versioned change records with the object's historical name and identifier. The UI displays the changed fields as Before/After values. Existing text records remain readable; they are not retroactively converted into diffs.

Account snapshots allow only profile fields, role identity, account status and MFA enabled state. Password replacement and explicit session revocation are descriptive events. Passwords, password hashes, session tokens and MFA secrets are excluded from these snapshots.

## Access scope

Audit access requires the audit capability. The environment filter and host-access filter apply to the list, counts and exports before pagination.

Account and role records, and records of the retired maintenance-window feature, are not treated as host-scoped events. They are unavailable to host-restricted readers, even when their text contains a host name. Readers with all-host scope retain the existing audit visibility rules.

## CSV export

The export contains all matching, accessible records, up to 10,000. Larger selections must be narrowed; the export is not silently truncated. It uses UTF-8 with BOM, semicolon separators and quoted cells. Original Details are retained, with Object ID, Object name and Changes added for recognized structured records, including SSH fingerprint changes. Change summaries can contain quoted newlines.

Values that could be interpreted as spreadsheet formulas are prefixed with an apostrophe for text handling. Consumers needing literal source values should use the stored audit data/API rather than removing protection and opening untrusted values in a spreadsheet.

The export event must be recorded before the download is sent. A recorded export indicates preparation for delivery, not proof that the client received or saved the file.

Startup cleanup removes entries older than 90 days. Entries can remain longer until the next startup. Audit exports should be retained according to the organization's own policy.

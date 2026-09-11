# Audit history and export

Role, administrator account, maintenance and SSH key replacement mutations store versioned change records with the object's historical name and identifier. The UI displays the changed fields as Before/After values. Existing text records remain readable; they are not retroactively converted into diffs.

Account snapshots allow only profile fields, role identity, account status and MFA enabled state. Password replacement and explicit session revocation are descriptive events. Passwords, password hashes, session tokens and MFA secrets are excluded from these snapshots.

Maintenance history includes UTC start/end, the configured timezone, host names and identifiers, change reference, impact, owner, recurrence and cancellation metadata. The UI formats audit instants in the shared Europe/Zurich display timezone, with seconds; the original UTC values remain in tooltips and exported details. Each occurrence in a newly created series has its own audit record. Later deletion does not remove these records, subject to ordinary audit retention.

## Access scope

Audit access requires the audit capability. The environment filter and host-access filter apply to the list, counts and exports before pagination.

For host-restricted readers, new maintenance records require access to every host referenced on either side of the change. Changes involving the entire environment are not shown to these readers. Missing or unrecognized scope metadata is not inferred from names or descriptions. Historical records without this metadata therefore remain unavailable to host-restricted readers. Host renames do not change visibility; loss of access to a referenced host does. Deleted hosts cannot establish current access.

Account and role records are not treated as host-scoped events. They are unavailable to host-restricted readers, even when their text contains a host name. Readers with all-host scope retain the existing audit visibility rules.

## CSV export

The export contains all matching, accessible records, up to 10,000. Larger selections must be narrowed; the export is not silently truncated. It uses UTF-8 with BOM, semicolon separators and quoted cells. Original Details are retained, with Object ID, Object name and Changes added for recognized structured records, including SSH fingerprint changes. Change summaries can contain quoted newlines.

Values that could be interpreted as spreadsheet formulas are prefixed with an apostrophe for text handling. Consumers needing literal source values should use the stored audit data/API rather than removing protection and opening untrusted values in a spreadsheet.

The export event must be recorded before the download is sent. A recorded export indicates preparation for delivery, not proof that the client received or saved the file.

Startup cleanup removes entries older than 90 days. Entries can remain longer until the next startup. Audit exports should be retained according to the organization's own policy.

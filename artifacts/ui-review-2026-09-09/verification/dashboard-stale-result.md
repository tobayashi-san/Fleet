Dashboard stale-catalog check

The actual DashboardPage with a synthetic API shows incomplete checks for an empty but stale OS catalog and suppresses the healthy summary. Clicking the fixture's fresh-check button restores the healthy summary when both catalogs are known empty.

Evidence: dashboard-stale-review.html and dashboard-stale-current.png. No live catalog was modified. The temporary frontend entry point was removed.

Repeated checks passed: six backend inventory/catalog metadata tests and twelve frontend update summary/attention sorting tests. Full P1-02 acceptance remains open.

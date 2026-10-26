# Changelog

Dates are when the work was done. Each release lists only what changed since
the one before, so it can be quoted as "built during" a given event.

## Unreleased

Started 2026-10-26.

### Fixed

- Restock plans could buy at most 100 packs of any one item, so a drive that
  needed more planned fewer kits than its budget allowed, with no warning. For
  example, 100 kits that each need 2 glue sticks sold singly at $0.50 planned
  50 kits instead of 100. The limit is gone: purchases are now bounded only by
  what the kits need and what the budget pays for.
- Free packs (price $0) could be suggested in far larger numbers than the plan
  uses. Purchases are now trimmed to what the planned kits need.
- A drive saved in the middle of an edit, with a promise above the requested
  count or more requested kits than the limit, could not be reopened. v1.0
  replaced it with the sample drive on the next visit. Such drives and backups
  now reopen, and the plan says what to fix.
- A drive with no kit types showed a broken sheet layout on desktop.
- A saved drive that this version cannot open is now kept in the browser
  instead of being replaced by the sample drive (up to five such copies). A
  banner offers to download, delete or hide them.

### Changed

- The LP builder was simplified without changing the model it writes. Snapshot
  tests of the LP text guard this.

## v1.0 — 2026-10-07

The version submitted to LUMA Hackathon (Fall 2026) and ImpactHack 2026.

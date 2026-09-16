# Retired Market Apps

Entries here are deliberately absent from the installable catalog. Their former
manifests and assets remain recoverable from Forgejo history. Re-adding an entry
requires the stated gate plus the Market's current metadata, immutable-image,
fresh-install, Scout, persistence, and repository acceptance gates.

## Planka

- Delisted: 2026-08-14
- Former Market version: 2.1.1
- Reason: the secure Community 2.2.1 release removed OIDC/SSO into the separately
  licensed paid edition. Its supported local login cannot complete behind the current
  YouEye forward-auth gate because both layers use the `accessToken` and
  `accessTokenVersion` cookie names on the application hostname.
- Acceptance outcome: rejected after an exact clean install of official immutable
  Community 2.2.1 index `sha256:125f45330853210c678fed1132bedc0912b4a11a27779b79802fbca108e069e2`.
  The terms and login APIs completed, but the authenticated client remained on an
  infinite loader. Community 2.1.1 was also rejected because it predates the 2.2.1
  path-traversal security fix.
- Re-entry gate: YouEye must namespace its outer-auth cookies for app hostnames, or
  the product must approve and license PLANKA Pro's OIDC integration. The resulting
  current secure release must then pass clean-install admin and standard-user board
  collaboration plus supported restart persistence.

## Redlib

- Delisted: 2026-08-14
- Former Market version: sha-a4d36e9
- Reason: the exact maintained candidate could not create the spoofed Reddit OAuth
  client that its anonymous browsing path requires. Reddit returned HTTP 403, and
  real home and subreddit journeys rendered Redlib's 404 error page.
- Acceptance outcome: rejected after an exact clean install of official immutable
  Quay index `sha256:e6647a94d553bf3f7c95c53fc6d9da5785e6c278d9002e99ea32abdb5e3c513a`.
  Container health alone did not satisfy the primary browsing gate.
- Re-entry gate: a maintained immutable release must use an upstream-supported
  Reddit access method and complete real home, subreddit, post, and comment journeys
  from a clean YouEye install and after a supported restart.

## Whoogle

- Delisted: 2026-08-14
- Former Market version: 0.9.0
- Reason: on 2026-07-24 the upstream maintainer declared that Whoogle no longer
  returns search results because Google removed the final non-JavaScript request
  path, and ended releases, fixes, contributions, and deployment support.
- Acceptance outcome: rejected. A container-start smoke test cannot replace a
  working primary search journey.
- Re-entry gate: a maintained upstream or fork must publish an immutable reviewed
  release that completes real searches from a clean YouEye install and remains
  functional after a supported restart.

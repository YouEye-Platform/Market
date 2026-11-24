# Rallly presentation and source notices

Reviewed 2026-11-24 for 4.17.2 (YE-186).

- Application source: https://github.com/lukevella/rallly/tree/v4.17.2 (commit ee0603bb), AGPL-3.0. Exact upstream LICENSE retained in LICENSE.upstream.txt; preserve its notices.
- Licensing terms for self-hosting (https://support.rallly.co/self-hosting/licensing): free for personal use; a multi-user setup needs a paid licence key (Rallly Plus or Organization). Without a key Rallly shows a licence reminder once more than one account exists, and shared spaces take one member. YouEye ships the image unmodified and does not remove or bypass this check; the listing states the terms.
- Official image: docker.io/lukevella/rallly:4.17.2 (built by upstream), index sha256:e43d8f750728ba500f512c4f3ae2c26d66c2666e68447659825a8ed2618f7ced (linux/amd64, linux/arm64).
- Sidecar: rclone 1.76.0 (https://github.com/rclone/rclone, MIT), its `serve s3` command as the S3 store for uploads (upstream's own stack uses Garage); official image docker.io/rclone/rclone:1.76.0, index sha256:7cbeec24a44f206067597c0368be4de90ae19a64d5113c7d1938bd737a81e466.
- icon.svg is Rallly's app icon, copied unmodified from https://raw.githubusercontent.com/lukevella/rallly/v4.17.2/assets/images/app-icon.svg. Rallly's press kit offers its logos for use as provided; it identifies the application and does not claim endorsement by the Rallly project.
- Screenshots are Rallly's official press-kit screenshots, copied unmodified from apps/landing/public/press/screenshots/ at tag v4.17.2, with made-up demo data only.
- YouEye's manifest repeats the image's start steps (migrate, then the server) with `exec`, and makes the first YouEye ID account Rallly's administrator with one SQL statement while none exists; no upstream code is copied or changed.
- Exact asset hashes are in asset-provenance.json.

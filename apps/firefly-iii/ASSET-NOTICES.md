# Firefly III presentation and source notices

Reviewed 2026-11-24 for 6.7.9 (YE-175).

- Application source and UI: https://github.com/firefly-iii/firefly-iii/tree/v6.7.9, AGPL-3.0. Exact upstream LICENSE retained in LICENSE.upstream.txt; preserve its notices.
- Release: https://github.com/firefly-iii/firefly-iii/releases/tag/v6.7.9.
- Official image: docker.io/fireflyiii/core:version-6.7.9, index sha256:10bbe21fbdc68b8fa955d85827aeed197ab46d62c8c745e949d322b9f4b73ff5 (linux/amd64, linux/arm64; revision ba26768619842a4926655f315716f1b7788933d7). Upstream rebuilds the tag; the digest is the pin.
- icon.svg is Firefly III's own logo, copied unmodified from https://raw.githubusercontent.com/firefly-iii/firefly-iii/v6.7.9/public/maskable-icon.svg (AGPL-3.0 header in the file, (c) 2022 james@firefly-iii.org; the README credits the logo to Cherie Woo; no separate trademark policy found). It identifies the application and does not claim endorsement by the Firefly III project.
- Screenshots are copied unmodified from the Firefly III repository at tag v6.7.9 (.github/assets/img/, shown in the README). They show upstream's demo data in device mock-ups. No passwords, tokens or private addresses.
- YouEye's setup/install.yaml calls Firefly III's own classes (UserRepository, NewUserRegistered) to create the owner account; no upstream code is copied or changed.
- Exact asset hashes are in asset-provenance.json.

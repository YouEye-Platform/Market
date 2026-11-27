# Firefly III presentation and source notices

Reviewed 2026-11-24 for 6.7.9 (YE-175); 2026-11-27 for 6.7.12 (YE-285): icon, screenshots and LICENSE are byte-identical at v6.7.12.

- Application source and UI: https://github.com/firefly-iii/firefly-iii/tree/v6.7.12, AGPL-3.0. Exact upstream LICENSE retained in LICENSE.upstream.txt; preserve its notices.
- Release: https://github.com/firefly-iii/firefly-iii/releases/tag/v6.7.12.
- Official image: docker.io/fireflyiii/core:version-6.7.12, index sha256:99319a6ce1370eba9e85f78e4d506e76267af0e7acc40fb4189b34d5fe83c874 (linux/amd64, linux/arm64; revision 498b66c758e219d2b21f61f037dbce1b8479e01e). Upstream rebuilds the tag; the digest is the pin.
- icon.svg is Firefly III's own logo, copied unmodified from https://raw.githubusercontent.com/firefly-iii/firefly-iii/v6.7.12/public/maskable-icon.svg (AGPL-3.0 header in the file, (c) 2022 james@firefly-iii.org; the README credits the logo to Cherie Woo; no separate trademark policy found). It identifies the application and does not claim endorsement by the Firefly III project.
- Screenshots are copied unmodified from the Firefly III repository at tag v6.7.12 (.github/assets/img/, shown in the README). They show upstream's demo data in device mock-ups. No passwords, tokens or private addresses.
- YouEye's setup/install.yaml calls Firefly III's own classes (UserRepository, NewUserRegistered) to create the owner account; no upstream code is copied or changed.
- Exact asset hashes are in asset-provenance.json.

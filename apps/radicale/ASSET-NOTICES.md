# Radicale presentation and source notices

Reviewed 2026-11-24 for 3.9.2 (YE-178).

- Application source and web page: https://github.com/Kozea/Radicale/tree/v3.9.2 (commit c21fa45), GPL-3.0. Exact upstream COPYING.md retained in LICENSE.upstream.txt; preserve its notices.
- Official image: ghcr.io/kozea/radicale:3.9.2 (built by upstream from its Dockerfile), index sha256:c74545ef669a3166646ec13438a31b5d0bfff198d8ba7ecd214c0a5f40f03fb4 (linux/amd64, linux/arm64, linux/arm/v7). The `latest` tag is the nightly build and is never used.
- icon.svg is Radicale's logo, copied unmodified from https://raw.githubusercontent.com/Kozea/Radicale/v3.9.2/radicale/web/internal_data/css/logo.svg (GPL-3.0 like the repository; no separate trademark policy found). It identifies the application and does not claim endorsement by the Radicale project.
- Screenshots: upstream publishes none, so they are YouEye's own captures of Radicale's unmodified web page on a YouEye test box, with demo data only (a throw-away test account, made-up calendar and address book names). No passwords, tokens, private addresses or personal data.
- YouEye writes only Radicale's config file and creates the household account's htpasswd entry with the image's own htpasswd tool; no upstream code is copied or changed.
- Exact asset hashes are in asset-provenance.json.

# Prowlarr package and assets

Verified 2026-10-23 against [stable release 2.6.5.5623](https://github.com/Prowlarr/Prowlarr/releases/tag/v2.6.5.5623).
Prowlarr contributors retain their GPL-3.0 rights; the tagged upstream
[licence](https://raw.githubusercontent.com/Prowlarr/Prowlarr/v2.6.5.5623/LICENSE)
is included as LICENSE.upstream.txt.

The unmodified LinuxServer image is documented at
https://docs.linuxserver.io/images/docker-prowlarr/ and built from
https://github.com/linuxserver/docker-prowlarr .
Registry labels identify 2.6.5.5623-ls165, built 2026-10-20,
source revision 4cd036cab22ea73e5cd9ef6a431d60353f1c1a8e.
The amd64 child digest is
`sha256:9ad6d7c7f1334a879b1d8aa488539c8cad5d19e7a876bb2ca2f6fd47b23fbc81`;
the observed multiarch index is
`sha256:b3b00047ed20f6ce2b16780145cb6a0acb51c9e28ea6aa6f5dcd33c7034f1797`.

icon.svg is an original geometric radar illustration created for this package
and dedicated under CC0-1.0: https://creativecommons.org/publicdomain/zero/1.0/ .
It replaces an icon whose exact origin was unresolved. It is not an upstream logo.

The two repository screenshots are historical captures of 2.5.2.5491.
They show Prowlarr's GPL-3.0 interface, credited to its contributors.
Opaque redactions remove the logo, demonstration result title/indexer and query.
No media artwork, passwords, tokens, private URLs or personal data are included.
No claim is made that the original demonstration media was public domain.
Captions disclose the historical version; current runtime checks are separate.
Exact asset hashes are retained in asset-provenance.json and asset-inventory.json.

## Deployment and authentication

One linux/amd64 service, HTTP port 9696, persistent /config containing SQLite and
configuration. No companion integration is needed. Allow 1 GiB RAM and 2 GiB
disk as a conservative test budget; upstream does not specify a hard minimum.
Install and restart through native YouEye app operations.

The existing External authentication mode delegates interactive login to YouEye
forward-auth. Use all_users with publicAccess=false. This is one shared service,
without per-user application roles; household administrators and standard users
use the same interface. API-key authentication remains enabled for service
wiring. Platform login/logout and anonymous denial must be tested separately.

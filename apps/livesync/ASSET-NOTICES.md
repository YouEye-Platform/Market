# Self-hosted LiveSync (Apache CouchDB) presentation and source notices

Reviewed 2026-11-24 for CouchDB 3.5.3 and the plugin 1.0.52 (YE-174).

- Server source: Apache CouchDB https://github.com/apache/couchdb/tree/3.5.3, Apache-2.0. Exact upstream LICENSE retained in LICENSE.upstream.txt; preserve its notices (upstream NOTICE: "Apache CouchDB, Copyright 2009-2025 The Apache Software Foundation. This product includes software developed at The Apache Software Foundation").
- Official image docker.io/library/couchdb:3.5.3 (Docker Official Image, packaging apache/couchdb-docker, Apache-2.0), index sha256:907eab5b7e55ab7cfd241d39b90b2a335ea40bef82acee5a37388c08bf201dda (linux/amd64, linux/arm64).
- Client: the Obsidian community plugin Self-hosted LiveSync, https://github.com/vrtmrz/obsidian-livesync (tag 1.0.52), MIT, by vorotamoroz. YouEye does not ship the plugin; people install it in Obsidian. Obsidian is a trademark of Dynalist Inc.; this app is not made or endorsed by Obsidian.
- icon.svg is Apache CouchDB's couch symbol, copied unmodified from the ASF's CouchDB brand kit: https://raw.githubusercontent.com/apache/couchdb-www/fd9abcbeb3b8a0fb9327816989bb0e6cea428215/CouchDB-visual-identity/logo/CouchDB-couch-symbol.svg. The plugin has no logo of its own. Apache CouchDB, CouchDB and the couch logo are trademarks of The Apache Software Foundation; used under the ASF trademark policy (https://www.apache.org/foundation/marks/) only to identify the CouchDB server this app runs, without implying endorsement.
- Screenshots are copied unmodified from the plugin repository at tag 1.0.52 (images/couchdb-manual/, images/quick-setup/; MIT). They show the plugin's UI with upstream test data only (example URL, masked password, test database names): no passwords, tokens, private addresses or personal data.
- Exact asset hashes are in asset-provenance.json.

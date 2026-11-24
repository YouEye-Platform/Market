# ONLYOFFICE Docs presentation and source notices

Reviewed 2026-11-24 for 10.0.0 (YE-192).

- Application: ONLYOFFICE Docs Community Edition, https://github.com/ONLYOFFICE/DocumentServer/tree/v10.0.0,
  GNU AGPL v3 (exact upstream LICENSE retained in LICENSE.upstream.txt; preserve its notices, including the AGPL §7(b)
  requirement to keep the ONLYOFFICE logo in the editors, which this unmodified image does).
- Official image: docker.io/onlyoffice/documentserver:10.0.0 (package 10.0.0-169), index
  sha256:ca17889f10b11141cc6441836aebdd2835cf3e1b49681b2fd6e155c94b7850b3 (linux/amd64, linux/arm64). YouEye runs it
  unmodified and only sets its documented environment (JWT secret, private addresses).
- ONLYOFFICE is a trademark of Ascensio System SIA. The name and logo identify the unmodified software as
  originating from ONLYOFFICE (https://www.onlyoffice.com/trademark-policy); they imply no endorsement of YouEye.
- icon.svg is ONLYOFFICE's three-layer mark, taken from the colour logo
  https://raw.githubusercontent.com/ONLYOFFICE/web-apps/v10.0.0.169/apps/common/main/resources/img/about/logo_s.svg
  (the editors' About logo at the tag): its three coloured paths are copied unchanged; the wordmark path is left out
  and the svg element's size and viewBox fit the mark (the same mark the project uses alone as its favicon).
- Screenshots are ONLYOFFICE's own, copied byte for byte at the tags:
  - screenshots/onlyoffice-docs.png:
    https://raw.githubusercontent.com/ONLYOFFICE/DocumentServer/v10.0.0/screenshots/ONLYOFFICE%20Docs.png
  - screenshots/nextcloud-editor.png (the editor inside Nextcloud):
    https://raw.githubusercontent.com/ONLYOFFICE/onlyoffice-nextcloud/v10.2.1/screenshots/main.png
- Exact asset hashes are in asset-provenance.json.

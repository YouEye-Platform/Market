# Kiwix presentation and source notices

Reviewed 2026-11-24 for kiwix-serve 3.8.2 (YE-87).

- Application source: https://github.com/kiwix/kiwix-tools/tree/3.8.2 (commit f76e38bdc06b86b73ba8e84a5de234a0d6c3fa3d), GPL-3.0; its web UI comes from libkiwix (https://github.com/kiwix/libkiwix, GPL-3.0). Exact upstream COPYING retained in LICENSE.upstream.txt; preserve its notices.
- Release: https://github.com/kiwix/kiwix-tools/releases/tag/3.8.2.
- Official image ghcr.io/kiwix/kiwix-serve:3.8.2 (rebuilt 2026-09-11), index sha256:e478554a9920412eeb5ce1d73f24e4b28445ebed233187cdd03c623c32be46a5 (linux/386, linux/amd64, linux/arm64, linux/arm/v6, linux/arm/v7).
- icon.svg is Kiwix's app icon (the kiwi), copied unmodified from the official Kiwix desktop app repository at tag 2.5.1: https://raw.githubusercontent.com/kiwix/kiwix-desktop/2.5.1/resources/icons/kiwix-app-icons-square.svg (repository licence GPL-3.0; no separate brand rules found). It identifies the application and does not claim endorsement by Kiwix or Wikimedia CH.
- Screenshots are own captures (2026-11-24, kiwix-serve 3.8.2 on a YouEye test box) because upstream's only screenshots (kiwix-tools docker/server/pictures) show the old 2.x library page. They show Kiwix's sample ZIM wikipedia_en_ray-charles_maxi_2026-10 (download.kiwix.org): article text from English Wikipedia, CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/; Wikipedia contributors, https://en.wikipedia.org/wiki/Ray_Charles); the photo is Ray_Charles_classic_piano_pose.jpg (Maurice Seymour, 1969), public domain per Wikimedia Commons. The Kiwix UI is GPL-3.0 (libkiwix).
- Exact asset hashes are in asset-provenance.json.

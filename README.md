# YouEye Market

Official app catalog for the [YouEye](https://github.com/YouEye-Platform/YouEye) self-hosted platform.

The Market is a plain YAML catalog with **no releases and no version**. Each branch is built into a folder of
static files and published on `market.youeye.me`; a YouEye box (0.6.11 or later) reads it from there to list,
install and update apps. Anyone can browse the same build as a website at <https://market.youeye.me>.

| Branch | Published at | Read by YouEye boxes on |
|---|---|---|
| `main` | `https://market.youeye.me/` | the beta and stable channels |
| `dev` | `https://market.youeye.me/dev/` | the dev and alpha channels |
| test branches | `https://market.youeye.me/test/<name>/` (unlisted) | test boxes that add it as a custom market |

The published format (`youeye.market.v1`) is described in YouEye's
[`docs/market-format.md`](https://github.com/YouEye-Platform/YouEye/blob/main/docs/market-format.md); anyone can
build and host a market of their own in the same format.

## What Is In This Repo

| Path | Purpose |
|---|---|
| `store.yaml` | The market's `name`, `publisher` and `homepage` (they go into `market.json`) |
| `catalog.yaml` | Root catalog (`youeye.catalog.v1`): categories, curated rows and native app ids |
| `apps/<app-id>/youeye-app.yaml` | App manifest (`youeye.app.v1`, see YouEye `docs/app-manifest.md`) |
| `apps/<app-id>/setup/*.yaml` | Optional setup files (`youeye.setup.v1`): SSO through an admin API or CLI, install steps, URL changes, connections |
| `apps/<app-id>/icon.*`, `screenshots/` | The pictures the listing names (`icon_file`, `screenshots`): svg, png, jpg, webp or gif, at most 5 MiB each |
| `apps/<app-id>/ASSET-NOTICES.md`, `LICENSE*`, `COPYING*` | Licence and notice files, published as text under `notices/<app-id>/` (a name without `.txt` or `.md` gets `.txt`; other extensions are refused) |
| `bundles/<bundle-id>/bundle.yaml` | Curated multi-app install recipes (`youeye.bundle.v1`); every folder here is offered |
| `asset-provenance.json` | One source record per icon and screenshot; not an assertion of ownership or rights |
| `drafts/` | Kept but not published (e.g. the hidden media-automation bundle) |
| `RETIRED.md` | Delisted app decisions and their explicit re-entry gates |
| `tests/*.spec.mjs` | Catalog tests (`node:test`); `market-build.spec.mjs` runs the generator from a YouEye checkout |
| `out/` | Local build output (git-ignored) |

## App Types

**Native apps** are maintained in their own GitHub repositories and named by id in `catalog.yaml`:

| App | Repository |
|---|---|
| Wiki | [`YouEye-Platform/YE-App-Wiki`](https://github.com/YouEye-Platform/YE-App-Wiki) |
| Search | [`YouEye-Platform/YE-App-Search`](https://github.com/YouEye-Platform/YE-App-Search) |
| Notes | [`YouEye-Platform/YE-App-Notes`](https://github.com/YouEye-Platform/YE-App-Notes) |
| Cinema | [`YouEye-Platform/YE-App-Cinema`](https://github.com/YouEye-Platform/YE-App-Cinema) |
| Weather | [`YouEye-Platform/YE-App-Weather`](https://github.com/YouEye-Platform/YE-App-Weather) |
| Translate | [`YouEye-Platform/YE-App-Translate`](https://github.com/YouEye-Platform/YE-App-Translate) |

A box finds each native app's release through its own channel index; this catalog only lists the id.

**Container apps** live directly under `apps/`. Their manifests describe the image (pinned by digest), port, data,
environment, health check and sign-in; anything env vars cannot do is a setup file next to the manifest.

**Bundles** install several apps together and approve their connections, which run the members' `setup/connect-<app>.yaml` files.

## Catalog Layout

Apps are discovered from `apps/*/youeye-app.yaml`; `catalog.yaml` holds only what cannot be discovered:

- `categories` controls Market filter pills and ordering; every app's `listing.category` must be one of them.
- `curation` controls the featured rows on the Market home.
- `native` names the native apps by id.
- Bundles are discovered from `bundles/*/bundle.yaml`.

## Checking a change

The Market is built by the generator in the YouEye repository (`control-panel/scripts/market-build.ts`), which
checks every manifest, setup file, bundle, picture and provenance record with the Control Panel's own parser and
refuses to write anything when one check fails. Use Node 24 and point `YOUEYE_ROOT` at a YouEye checkout whose
`control-panel/node_modules` is installed (`pnpm install` there):

```bash
YOUEYE_ROOT=../YouEye npm test        # catalog tests, including a full build (twice, byte for byte)
YOUEYE_ROOT=../YouEye npm run build   # writes the static market and its website into out/
```

The output depends only on the repository content and the commit. Third-party manifest versions and OCI digests are
copied, never rewritten. An app that uses a manifest field newer than the first app format must declare the YouEye
version that reads it (`requires: { youeye: ">=X.Y.Z" }`); the build says which version when it is missing.

## Publishing

There is nothing to release: a commit on `dev` or `main` is published by the maintainers' publish tool, and boxes
pick it up within minutes. Changes go to `dev` first and are merged into `main` when they are right. Branches only
move forward; a mistake is undone with a new commit. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution scope, checks, asset provenance and publishing.

## License

YouEye source code is licensed under the [Business Source License 1.1](LICENSE). Each version converts to AGPL-3.0 after four years.

The "YouEye" name and logo are trademarks. See [TRADEMARK.md](TRADEMARK.md) for usage guidelines.

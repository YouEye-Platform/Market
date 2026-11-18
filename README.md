# YouEye Market

Official app catalog for the [YouEye](https://github.com/YouEye-Platform/YouEye) self-hosted platform.

The Market is a plain YAML catalog. There are no Market releases: a push to `dev` or `main` is published as static files (`market.youeye.me/dev/` and `market.youeye.me/`), which the YouEye Control Panel reads to show the available apps and to install and update containers.

## What Is In This Repo

| Path | Purpose |
|---|---|
| `catalog.yaml` | Root catalog (`youeye.catalog.v1`): categories, curated rows and native app ids |
| `asset-provenance.json` | One source record per icon and screenshot; not an assertion of ownership or rights |
| `store.yaml` | The market's name, publisher and homepage |
| `apps/<app-id>/youeye-app.yaml` | App manifest (`youeye.app.v1`, see YouEye `docs/app-manifest.md`) |
| `apps/<app-id>/setup/*.yaml` | Optional setup files (`youeye.setup.v1`): SSO through an admin API or CLI, install steps, URL changes, connections |
| `apps/<app-id>/icon.*` | App icon shown in Market and launch surfaces |
| `bundles/<bundle-id>/bundle.yaml` | Curated multi-app install recipes (`youeye.bundle.v1`); every folder here is offered |
| `apps/<app-id>/ASSET-NOTICES.md`, `LICENSE*`, `COPYING*` | Licence and notice files, published unchanged under `notices/<app-id>/` |
| `drafts/` | Kept but not published (e.g. the hidden media-automation bundle) |
| `RETIRED.md` | Delisted app decisions and their explicit re-entry gates |
| `tests/*.spec.mjs` | Catalog tests (`node:test`; the build test runs the generator from `YOUEYE_ROOT`) |

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

**Container apps** live directly under `apps/`. Their manifests describe the image, port, data, environment, health check and sign-in; anything env vars cannot do is a setup file next to the manifest.

**Bundles** install several apps together and approve their connections, which run the members' `setup/connect-<app>.yaml` files.

## Catalog Layout

Apps are discovered from `apps/*/youeye-app.yaml`; `catalog.yaml` holds only what cannot be
discovered:

- `categories` controls Market filter pills and ordering.
- `curation` controls the featured rows on the Market home.
- `native` names the native apps by id; the box finds their releases through its channel index.
- Bundles are discovered from `bundles/*/bundle.yaml`.

## Validation

The Market is built by the generator in the YouEye repository
(`control-panel/scripts/market-build.ts`), which checks every manifest, setup file,
bundle, picture and provenance record with the Control Panel's own parser. Point
`YOUEYE_ROOT` at a YouEye checkout (with `control-panel/node_modules` installed):

```bash
YOUEYE_ROOT=../YouEye npm test        # catalog tests, including a full build
YOUEYE_ROOT=../YouEye npm run build   # writes the static market into out/
```

The output depends only on the repository content and the commit. Third-party
manifest versions and OCI digests are copied, never rewritten. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing and publishing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution scope, asset provenance
and publishing.

## License

YouEye source code is licensed under the [Business Source License 1.1](LICENSE). Each version converts to AGPL-3.0 after four years.

The "YouEye" name and logo are trademarks. See [TRADEMARK.md](TRADEMARK.md) for usage guidelines.

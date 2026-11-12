# YouEye Market

Official app catalog for the [YouEye](https://github.com/YouEye-Platform/YouEye) self-hosted platform.

The Market is a plain YAML catalog. Each release packs it into `catalog.tar`; the YouEye Control Panel reads that archive, shows the available apps, and uses the manifests in it to install and update containers.

## What Is In This Repo

| Path | Purpose |
|---|---|
| `catalog.yaml` | Root catalog (`youeye.catalog.v1`): categories, curated rows and native app ids |
| `VERSION` | Release line (`X.Y.Z`); builds are released as `catalog-vX.Y.Z-dev.N` |
| `asset-inventory.json` | Asset digest inventory; intentionally not an assertion of ownership or rights |
| `store.yaml` | Store metadata for the official YouEye Market source |
| `apps/<app-id>/youeye-app.yaml` | App manifest (`youeye.app.v1`, see YouEye `docs/app-manifest.md`) |
| `apps/<app-id>/setup/*.yaml` | Optional setup files (`youeye.setup.v1`): SSO through an admin API or CLI, install steps, URL changes, connections |
| `apps/<app-id>/icon.*` | App icon shown in Market and launch surfaces |
| `bundles/<bundle-id>/bundle.yaml` | Curated multi-app install recipes (`youeye.bundle.v1`); every folder here is offered |
| `drafts/` | Kept but not released (e.g. the hidden media-automation bundle) |
| `system/<id>.yaml` | Pinned system images used by Control Panel for core infrastructure (`youeye.system-app.v1`) |
| `RETIRED.md` | Delisted app decisions and their explicit re-entry gates |
| `tests/*.spec.mjs` | Dependency-free catalog validation tests |

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

**System manifests** describe pinned infrastructure images. Control Panel still owns deployment policy, secrets, routes, volumes, and health checks.

## Catalog Layout

Apps are discovered from `apps/*/youeye-app.yaml`; `catalog.yaml` holds only what cannot be
discovered:

- `categories` controls Market filter pills and ordering.
- `curation` controls the featured rows on the Market home.
- `native` names the native apps by id; the box finds their releases through its channel index.
- Bundles are discovered from `bundles/*/bundle.yaml`.

## Validation

The catalog tests use Node's built-in test runner and do not install extra dependencies.

```bash
pnpm test
```

`pnpm catalog:validate` checks the app folders and catalog index, the asset
inventory and asset provenance. `pnpm catalog:release <dir>` writes the release's
`catalog-snapshot.json` and `catalog.tar`; both depend only on the repository
content. Third-party manifest versions and OCI digests are hashed, never
rewritten. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing and releases

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution scope, asset provenance,
catalog releases.

## License

YouEye source code is licensed under the [Business Source License 1.1](LICENSE). Each version converts to AGPL-3.0 after four years.

The "YouEye" name and logo are trademarks. See [TRADEMARK.md](TRADEMARK.md) for usage guidelines.

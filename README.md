# YouEye Market

Official app catalog for the [YouEye](https://github.com/YouEye-Platform/YouEye) self-hosted platform.

The Market is a plain YAML catalog. Each release packs it into `catalog.tar`; the YouEye Control Panel reads that archive, shows the available apps, and uses the manifests in it to install and update containers.

## What Is In This Repo

| Path | Purpose |
|---|---|
| `catalog.yaml` | Root catalog: categories, curated rows, bundles, integrations, and app entries |
| `VERSION` | Release line (`X.Y.Z`); releases are `catalog-vX.Y.Z-rc.N` |
| `asset-inventory.json` | Asset digest inventory; intentionally not an assertion of ownership or rights |
| `store.yaml` | Store metadata for the official YouEye Market source |
| `apps/<app-id>/youeye-app.yaml` | Full manifest for a container app installed by Control Panel |
| `apps/<app-id>/icon.*` | App icon shown in Market and launch surfaces |
| `bundles/<bundle-id>/bundle.yaml` | Curated multi-app install recipes |
| `integrations/<app-id>/youeye-id.yaml` | Optional YouEye ID wiring recipes for supported apps |
| `system/*.yaml` | System image metadata used by Control Panel for core infrastructure |
| `updates/*.yaml` | Declarative update plans for app migrations |
| `RETIRED.md` | Delisted app decisions and their explicit re-entry gates |
| `tests/*.spec.mjs` | Dependency-free catalog validation tests |

## App Types

**Native apps** are maintained in their own GitHub repositories and referenced from `catalog.yaml`:

| App | Repository |
|---|---|
| Wiki | [`YouEye-Platform/YE-App-Wiki`](https://github.com/YouEye-Platform/YE-App-Wiki) |
| Search | [`YouEye-Platform/YE-App-Search`](https://github.com/YouEye-Platform/YE-App-Search) |
| Notes | [`YouEye-Platform/YE-App-Notes`](https://github.com/YouEye-Platform/YE-App-Notes) |
| Cinema | [`YouEye-Platform/YE-App-Cinema`](https://github.com/YouEye-Platform/YE-App-Cinema) |
| Weather | [`YouEye-Platform/YE-App-Weather`](https://github.com/YouEye-Platform/YE-App-Weather) |
| Translate | [`YouEye-Platform/YE-App-Translate`](https://github.com/YouEye-Platform/YE-App-Translate) |

**Container apps** live directly under `apps/`. Their manifests describe image source, ports, volumes, environment, health checks, permissions, and optional setup flows.

**Bundles** install several apps together and apply wiring recipes after installation.

**System manifests** describe pinned infrastructure images. Control Panel still owns deployment policy, secrets, routes, volumes, and health checks.

## Catalog Layout

`catalog.yaml` is intentionally data-driven:

- `categories` controls Market filter pills and ordering.
- `curation` controls the featured rows on the Market home.
- `bundles` points to bundle recipes.
- `apps` lists native app references and container app manifest paths.
- `integrations` lists optional wiring recipes.

Native apps are named by id only; the box finds their releases through its
channel index:

```yaml
- id: wiki
  integration: native
```

Container app entries point at local manifest folders:

```yaml
- id: jellyfin
  path: apps/jellyfin
  integration: basic
  latestVersion: "10.11.11"
```

## Validation

The catalog tests use Node's built-in test runner and do not install extra dependencies.

```bash
pnpm test
```

`pnpm catalog:validate` checks native entries, the asset inventory and asset
provenance. `pnpm catalog:release <dir>` writes the release's
`catalog-snapshot.json` and `catalog.tar`; both depend only on the repository
content. Third-party manifest versions and OCI digests are hashed, never
rewritten. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing and releases

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution scope, asset provenance,
catalog releases.

## License

YouEye source code is licensed under the [Business Source License 1.1](LICENSE). Each version converts to AGPL-3.0 after four years.

The "YouEye" name and logo are trademarks. See [TRADEMARK.md](TRADEMARK.md) for usage guidelines.

# YouEye Market

Official app catalog for the [YouEye](https://github.com/YouEye-Platform/YouEye) self-hosted platform.

The Market is a plain YAML catalog. YouEye Control Panel reads this repository directly from GitHub, shows the available apps, and uses the manifests here to install and update containers. There is no release artifact for this repo: publishing the branch is enough.

## What Is In This Repo

| Path | Purpose |
|---|---|
| `catalog.yaml` | Root catalog: categories, curated rows, bundles, integrations, and app entries |
| `store.yaml` | Store metadata for the official YouEye Market source |
| `apps/<app-id>/youeye-app.yaml` | Full manifest for a container app installed by Control Panel |
| `apps/<app-id>/icon.*` | App icon shown in Market and launch surfaces |
| `bundles/<bundle-id>/bundle.yaml` | Curated multi-app install recipes |
| `integrations/<app-id>/youeye-id.yaml` | Optional YouEye ID wiring recipes for supported apps |
| `system/*.yaml` | System image metadata used by Control Panel for core infrastructure |
| `updates/*.yaml` | Declarative update plans for app migrations |
| `tests/*.spec.mjs` | Dependency-free catalog validation tests |

## App Types

**Native apps** are maintained in their own GitHub repositories and referenced from `catalog.yaml`:

| App | Repository |
|---|---|
| Wiki | [`YouEye-Platform/Wiki`](https://github.com/YouEye-Platform/Wiki) |
| Search | [`YouEye-Platform/Search`](https://github.com/YouEye-Platform/Search) |
| Notes | [`YouEye-Platform/Notes`](https://github.com/YouEye-Platform/Notes) |
| Cinema | [`YouEye-Platform/Cinema`](https://github.com/YouEye-Platform/Cinema) |
| Weather | [`YouEye-Platform/Weather`](https://github.com/YouEye-Platform/Weather) |
| Translate | [`YouEye-Platform/Translate`](https://github.com/YouEye-Platform/Translate) |

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

Native app references use GitHub repo names, for example:

```yaml
- id: wiki
  repo: YouEye-Platform/Wiki
  manifest: youeye-app.yaml
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

## License

YouEye source code is licensed under the [Business Source License 1.1](LICENSE). Each version converts to AGPL-3.0 after four years.

The "YouEye" name and logo are trademarks. See [TRADEMARK.md](TRADEMARK.md) for usage guidelines.

# Contributing to YouEye Market

## Scope and release boundary

YouEye Market is source metadata: it curates catalog entries, manifests, wiring recipes, and presentation assets. It does not build, package, mirror, upload, or distribute application binaries or OCI images. Third-party application versions and image digests are selected and preserved in their own manifests; catalog snapshots never rewrite them.

Changes must be reviewed locally with `pnpm test`. Do not publish a branch, tag, release, artifact, image, or other binary from this repository unless an authorized release owner separately approves that action.

## Catalog releases

A catalog release is `catalog-v<version>`. `VERSION` holds the release line
(`X.Y.Z`); every release is `X.Y.Z-rc.N`, where the release tool picks the next
free `N` from this repository's release tags. A release keeps its version on
every channel (dev, alpha, beta, stable); promotion copies the same bytes and
never rebuilds. Nothing in the repository carries the release version.

A release holds three files:

- `catalog-snapshot.json`: the content record. It lists every catalog file with
  its SHA-256 digest: `catalog.yaml`, `store.yaml`, `RETIRED.md`,
  `asset-inventory.json`, `asset-provenance.json`, and every file under `apps/`,
  `bundles/`, `integrations/`, `system/` and `updates/` (manifests, icons,
  screenshots, notices), sorted by path. It carries no version, branch,
  repository or host, so the same commit gives the same bytes everywhere.
- `catalog.tar`: a plain ustar archive of exactly those files, in that order,
  with paths relative to the repository root (mode 0644, uid/gid 0, mtime 0).
  YouEye reads the official Market from this archive, never from Git.
- `product-release.json`: binds both files by SHA-256 and the source git tree.

```bash
node scripts/catalog-snapshot.mjs validate
node scripts/catalog-snapshot.mjs release <output directory>
```

Native apps are named by id only (`- id: notes` with `integration: native`). The
box finds each native app's release through its channel index, so the catalog
names no repository or branch and is identical on every host.

## Asset provenance during development

The contributor adding or changing an app owns its asset review as part of the
same change. Record icon and screenshot sources, applicable licence references,
required attribution, and any modifications alongside the app. Check the licence
for the selected upstream version. Review screenshots for credentials, private
links/data and embedded third-party media; use appropriate demonstration content.
Resolve ordinary gaps by researching sources, adding notices or replacing assets.

No separately appointed asset owner or legal reviewer is required. Follow the
release owner's actual authorization; do not request a second approval solely
because a change is being promoted. Escalate a specific unresolved rights question
with evidence and a proposed resolution. Authorization to publish is not proof
of third-party rights, and inventory hashes are not ownership assertions.

`asset-inventory.json` remains a deterministic inventory (`node
scripts/catalog-snapshot.mjs generate` rewrites it). Validation preserves exact
content and asset hashes. Provenance work belongs to app changes, rather than a
repeated human sign-off for unchanged assets at each release.

### Provenance records and validation

`asset-provenance.json` records exactly one `path`, `sha256`, HTTPS `source`,
`evidence` and explanatory `notes` entry per inventoried asset. Evidence is
`exact-source` for a byte-matched source, `project-reference` when only the
application project is established, or `local-capture` for repository screenshots.
Record uncertainty in notes; a project reference is not proof of icon origin.
These records make research visible, not a licence or ownership determination.

Validation rejects missing, duplicate, unknown or stale
records and malformed metadata. The provenance file itself is bound into the
canonical snapshot hash. Changes to assets require corresponding record updates;
unchanged evidence carries through releases. `asset-approvals.json`, reviewer
identities and per-release human approval records are no longer required.


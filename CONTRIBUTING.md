# Contributing to YouEye Market

## Scope and release boundary

YouEye Market is source metadata: it curates catalog entries, manifests, wiring recipes, and presentation assets. It does not build, package, sign, mirror, upload, or distribute application binaries or OCI images. Third-party application versions and image digests are selected and preserved in their own manifests; catalog snapshots never rewrite them.

Changes must be reviewed locally with `pnpm test`. Do not publish a branch, tag, release, artifact, image, or other binary from this repository unless an authorized release owner separately approves that action.

## Catalog snapshot policy

`catalog-snapshot.json` is an independent Market-owned release identity, not an application version. The initial catalog base is `0.5`. Versions follow the platform channel depths: Forgejo dev has six positions (initially `0.5.0.0.0.1`), Forgejo main has five (initially `0.5.0.0.1`). Generate it from local catalog content only:

```bash
node scripts/catalog-snapshot.mjs generate --version 0.5.0.0.0.1
node scripts/catalog-snapshot.mjs validate
```

The generated snapshot has the fixed Market identity `YouEye-Platform/Market` and records its own channel version, intended `main` release branch, `catalog-v<version>` tag naming, and `catalog.yaml` destination. Source-candidate validation can run on `dev`; it validates those declarations without asserting that the checkout is on `main` or tagged. Release-mode validation reads local Git state and requires a clean `main` checkout with the exact declared tag pointing at HEAD. Environment variables cannot substitute for that check.

Snapshot identity covers `catalog.yaml`, `store.yaml`, `RETIRED.md`, `asset-provenance.json`, and every YAML file under `apps/`, `bundles/`, `integrations/`, `system/`, and `updates/`, including application versions and OCI digests. Paths and raw-content digests are sorted deterministically. The separate asset-inventory digest binds the presentation assets.

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

`asset-inventory.json` remains a deterministic inventory. Release validation must
preserve exact content/asset hashes, clean checkout, branch/tag identity and
channel version checks. Provenance work belongs to app changes, rather than a
repeated human sign-off for unchanged assets at each release.

### Provenance records and validation

`asset-provenance.json` records exactly one `path`, `sha256`, HTTPS `source`,
`evidence` and explanatory `notes` entry per inventoried asset. Evidence is
`exact-source` for a byte-matched source, `project-reference` when only the
application project is established, or `local-capture` for repository screenshots.
Record uncertainty in notes; a project reference is not proof of icon origin.
These records make research visible, not a licence or ownership determination.

Both source and release validation reject missing, duplicate, unknown or stale
records and malformed metadata. The provenance file itself is bound into the
canonical snapshot hash. Changes to assets require corresponding record updates;
unchanged evidence carries through releases. `asset-approvals.json`, reviewer
identities and per-release human approval records are no longer required.

Private Forgejo promotion uses:

```bash
node scripts/catalog-snapshot.mjs validate --release --destination forgejo-main
```

It verifies a clean `main` checkout, exact catalog tag, five-position version,
and canonical content/asset hashes. GitHub beta uses `--destination github-beta`
on clean `beta` with `catalog-beta-v<four-position-version>`; GitHub main uses
`--destination github-main` on clean `main` with `catalog-v<three-position-version>`.
Both use the same asset integrity and provenance checks as development. The public
coordinator prepares independent snapshots without importing private history.
Source snapshots accept 3–8 numeric positions for platform channel compatibility.

## Release-profile regression checks

`pnpm test` runs the complete suite on the working source and on clean, tagged
Forgejo-main, GitHub-beta and GitHub-main fixtures. Keep tests independent of
the checkout's current release channel; explicit main-only scenarios must build
main fixtures rather than inherit the surrounding beta snapshot. Do not skip
tests or rewrite a prepared release candidate to work around a profile failure.

Snapshot generation accepts `--branch main|beta` and otherwise preserves the
existing declared release branch. The tag prefix follows that branch. Validation
still verifies real Git refs and does not take branch identity from environment
variables or a caller assertion.

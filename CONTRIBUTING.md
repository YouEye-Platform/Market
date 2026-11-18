# Contributing to YouEye Market

## Scope

YouEye Market is source metadata: it curates catalog entries, manifests, wiring recipes, and presentation assets. It does not build, package, mirror, upload, or distribute application binaries or OCI images. Third-party application versions and image digests are selected and preserved in their own manifests; the generator never rewrites them.

Do not create tags, releases, artifacts, images or other binaries from this repository. The Market has no releases and no version.

## Making a change

1. Branch from `dev`. One app per commit; say what changed and why (the version and digest for an image change).
2. For an app: `apps/<id>/youeye-app.yaml` (the folder name is the id), its `setup/*.yaml`, the pictures its listing
   names, one `asset-provenance.json` record per picture, and the id in `tests/catalog-apps.spec.mjs`
   (`REMAINING_DEBT` until it passed a fresh install on a real box, then `ACCEPTED`). Field reference: YouEye
   `docs/app-manifest.md`.
3. If the app uses a manifest or setup field that is newer than the first app format, add
   `requires: { youeye: ">=X.Y.Z" }` with the version the build names. Boxes older than that list the app as
   needing a newer YouEye. A field the YouEye parser does not know yet needs a YouEye release first.
4. Check locally (Node 24; a YouEye checkout with `control-panel/node_modules` installed):

   ```bash
   YOUEYE_ROOT=<YouEye checkout> npm test        # catalog tests and a full build
   YOUEYE_ROOT=<YouEye checkout> npm run build   # the market into out/, every problem listed
   ```

5. Push to `dev`. Never reset or force-push `dev` or `main` to an older commit: boxes refuse a market whose
   `sequence` (the commit time) is lower than the one they have, so an older state never reaches them. Undo with a
   new commit (a revert).

## Publishing

There are no Market releases and no Market version. A push to `dev` or `main` is published as static files: the
generator in the YouEye repository (`control-panel/scripts/market-build.ts`) turns the branch head into
`market.json`, an index, one small file per app, the pictures and a website, and the maintainers' publish tool puts
them on `market.youeye.me`:

| Branch | Address | Read by boxes on |
|---|---|---|
| `dev` | `https://market.youeye.me/dev/` | the dev and alpha channels |
| `main` | `https://market.youeye.me/` | the beta and stable channels |
| a test branch (on request) | `https://market.youeye.me/test/<name>/` | test boxes that add it as a custom market |

Boxes pick up a change at their next check (at most about five minutes, or at once with "Check for updates").
Every published file is checked by SHA-256, on the site after publishing and by every box. Merge `dev` into `main`
only when the change is right on a box that reads `dev`: `main` reaches every beta and stable box. When `main` is
published, the public repository `YouEye-Platform/Market` receives one snapshot commit of it.

Native apps are named by id only (`native: [notes, …]` in `catalog.yaml`). The box finds each native app's release
through its channel index, so the catalog names no repository or branch and is identical on every host.

## Asset provenance during development

The contributor adding or changing an app owns its asset review as part of the
same change. Record icon and screenshot sources, applicable licence references,
required attribution, and any modifications alongside the app. Check the licence
for the selected upstream version. Review screenshots for credentials, private
links/data and embedded third-party media; use appropriate demonstration content.
Resolve ordinary gaps by researching sources, adding notices or replacing assets.

No separately appointed asset owner or legal reviewer is required; do not request
a second approval solely because a change is merged or published. Escalate a
specific unresolved rights question with evidence and a proposed resolution.
Publishing is not proof of third-party rights, and provenance hashes are not
ownership assertions.

Provenance work belongs to app changes, rather than a repeated human sign-off
for unchanged assets at each publication.

### Provenance records and validation

`asset-provenance.json` (`apiVersion: youeye.market/asset-provenance/v1`, a list
`assets`) records exactly one `path`, `sha256` (`sha256:<hex>`), HTTPS `source`,
`evidence` and explanatory `notes` entry per picture under `apps/`. Evidence is
`exact-source` for a byte-matched source, `project-reference` when only the
application project is established, or `local-capture` for repository screenshots.
Record uncertainty in notes; a project reference is not proof of icon origin.
These records make research visible, not a licence or ownership determination.

The generator refuses missing, duplicate, unknown or stale
records and malformed metadata. Changes to assets require corresponding record
updates; unchanged evidence carries through. `asset-approvals.json`, reviewer
identities and per-publication human approval records are not required.


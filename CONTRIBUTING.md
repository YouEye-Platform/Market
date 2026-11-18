# Contributing to YouEye Market

## Scope and release boundary

YouEye Market is source metadata: it curates catalog entries, manifests, wiring recipes, and presentation assets. It does not build, package, mirror, upload, or distribute application binaries or OCI images. Third-party application versions and image digests are selected and preserved in their own manifests; catalog snapshots never rewrite them.

Changes must be reviewed locally with `YOUEYE_ROOT=<YouEye checkout> npm test`. Do not publish a branch, tag, release, artifact, image, or other binary from this repository unless an authorized release owner separately approves that action.

## Publishing

There are no Market releases and no Market version. A push to `dev` or `main` is
published as static files: the generator in the YouEye repository
(`control-panel/scripts/market-build.ts`) turns the commit into `market.json`, an
index, one small file per app and the pictures, and the CEO's publish tool puts
them on `market.youeye.me` (`/dev/` for `dev`, `/` for `main`). Boxes pick up the
change on their next check. Build it locally with `YOUEYE_ROOT=<YouEye checkout> npm
run build`.

Native apps are named by id only (`native: [notes, …]` in `catalog.yaml`). The
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

Provenance work belongs to app changes, rather than a repeated human sign-off
for unchanged assets at each publication.

### Provenance records and validation

`asset-provenance.json` records exactly one `path`, `sha256`, HTTPS `source`,
`evidence` and explanatory `notes` entry per picture under `apps/`. Evidence is
`exact-source` for a byte-matched source, `project-reference` when only the
application project is established, or `local-capture` for repository screenshots.
Record uncertainty in notes; a project reference is not proof of icon origin.
These records make research visible, not a licence or ownership determination.

The generator refuses missing, duplicate, unknown or stale
records and malformed metadata. Changes to assets require corresponding record
updates; unchanged evidence carries through. `asset-approvals.json`, reviewer
identities and per-release human approval records are no longer required.


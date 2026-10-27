# AGENTS.md — omarchy-NTE-wallpaper

Wallpaper gallery and manifest for Omarchy. The **images + metadata** live here; the
**deployment logic** lives in [`omarchy-NTE`](https://github.com/CAI991108/omarchy-NTE).

## Read first

- `HANDOFF.md` — local-only (gitignored): current state, open decisions, next steps.
  **Read it before changing anything.** A fresh clone will not have it.
- `docs/adr/` — why this repo exists separately and where binaries live.
- `README.md` — public usage and the add-a-wallpaper recipe.

## If the working copy is a partial clone

This repo carries ~15 MB of images, so it is easy to end up with a **blobless partial
clone** (`git clone --filter=blob:none`). Symptom seen on 2026-10-27:

- `git commit` appears to hang. The process tree shows an unexpected
  `git ... fetch origin --no-tags --no-write-fetch-head --filter=blob:none --stdin`
  spawned by the commit, slowly pulling objects instead of failing.
- `git write-tree` stalls the same way: it will not write a tree that references
  blobs the clone does not have, so it tries to fetch them first.
- The killed fetch leaves `.git/index.lock` behind, and every later commit fails with
  `Another git process seems to be running in this repository`.

Commits `719c2ee` and `907bf14` were made with this workaround, which never fetches:

```bash
git add <paths>                                   # writes the new blobs from the worktree
tree=$(git write-tree --missing-ok)               # skip the "all blobs present" check
commit=$(git commit-tree "$tree" -p HEAD -F <msgfile>)
git update-ref refs/heads/main "$commit"
git push origin main                              # only the objects the remote lacks are sent
```

The pushed commit is complete: the only blobs it adds are the ones `git add` just wrote,
and every other blob already exists on the remote.

Root fix, on a healthy connection:

```bash
# simplest — re-clone without a filter
git clone https://github.com/CAI991108/omarchy-NTE-wallpaper.git

# or convert this checkout in place, then verify nothing is missing
git config --unset remote.origin.partialclonefilter
git config --unset remote.origin.promisor
git fetch --refetch origin
git rev-list --objects --missing=print --all | head   # must print nothing
```

A full clone answers `git config --get remote.origin.partialclonefilter` with an empty
string; if it prints `blob:none`, you are still on a partial clone.

## Commands

| Command | Purpose |
|---|---|
| `scripts/build.sh` | regenerate previews, `manifests/wallpapers.tsv\|json`, `CREDITS.md` |
| `scripts/build.sh --check` | fail if any generated file is stale; **run before every commit** |
| `python3 -m http.server 8080` | serve the gallery at `http://localhost:8080/` |
| `node --check gallery.js` | JS syntax check |

A change is done when `scripts/build.sh --check` exits 0, the gallery loads over
HTTP, and `git status --short` lists only files you meant to change.

## Contract with `omarchy-NTE`

`manifests/wallpapers.tsv` is the **single interface** (the JSON is generated from it).
The config repo's `install.sh --wallpapers[=<theme>|all]` downloads
`<base>/<file>`, verifies `sha256`, and copies it **flat** to
`~/.config/omarchy/backgrounds/<theme>/<basename(file)>`.

- Paths in the manifest are repo-relative (`wallpapers/<theme>/<id>.<ext>`).
- `bundled=1` means `omarchy-NTE` already ships that image; the installer skips it
  when an identical sha256 is already present.
- Changing a column, a path, or the flush rule is a **two-repo change**: update
  `omarchy-NTE/install.sh` in the same session and record it in `HANDOFF.md`.

## Conventions

- **One theme per directory**: `wallpapers/<theme>/<id>.<ext>`. No nested directories —
  Omarchy scans `~/.config/omarchy/backgrounds/<theme>/` with `find -maxdepth 1`.
- **The filename is the picker title**: lowercase ASCII, digits and hyphens
  (`01-nanally`, `02-rooftop`). Leading digits are stripped by Omarchy; Chinese titles
  go in `manifests/credits.tsv`, never in filenames.
- **Every image needs a credits row** in `manifests/credits.tsv`. Unknown source stays
  `待补`; never invent an author or URL.
- **Strip metadata** (`magick -strip`) before committing. Do not commit NSFW or
  uncredited art to a public repo.
- **No Git LFS.** Images stay in plain git until ~30 images / ~150 MB, then move to
  GitHub Releases (see `docs/adr/`). Removing an image does not shrink history.
- **Static gallery only**: plain HTML/CSS/JS, no framework, no build step, no backend.

## Done criteria

- **Add an image**: preview exists, credits row added, `build.sh --check` passes, the
  card appears over HTTP, `wallpapers.json` contains the `sha256` and dimensions.
- **Remove an image**: rebuild removes its preview and manifest row; no orphan files.
- **Publish**: Pages serves the gallery from the repo root (`main` / root, `.nojekyll`),
  the manifest returns 200, and every card's preview + download link resolves.
- **Cross-repo change**: `omarchy-NTE/install.sh --dry-run --wallpapers` touches no
  network and writes nothing; a real run installs verified files flat and is idempotent.

## Agent skills

### Issue tracker

GitHub Issues via the `gh` CLI; PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

The default five triage roles, label strings equal to the role names. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the repo root, decisions in `docs/adr/`. See `docs/agents/domain.md`.

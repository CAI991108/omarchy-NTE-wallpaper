# Wallpapers ship from a separate repo, driven by one manifest

**Status:** accepted (2026-10-26)

`omarchy-NTE` is cloned to bootstrap a desktop, and Omarchy reads wallpapers from
`~/.config/omarchy/backgrounds/<theme>/` with `find -maxdepth 1`. Bundling a growing
collection there would make every clone pay for images nobody asked for, and git
history cannot shrink cheaply. Wallpapers therefore live in `omarchy-NTE-wallpaper`:
the images, a static GitHub Pages gallery, and a generated manifest
(`manifests/wallpapers.tsv`) that the config repo's `install.sh --wallpapers` reads.
`omarchy-NTE` keeps exactly one bundled default so a fresh install still looks right
offline.

## Considered options

- **In `omarchy-NTE` directly** — every clone grows by ~4 MB per image forever; the
  single wallpaper already accounts for 3.82 of its 5.20 MB of git objects.
- **Git LFS** — clients need `git-lfs`, and other people's downloads count against the
  owner's 10 GiB/month free bandwidth.
- **GitHub Releases from day one** — uncapped bandwidth, but per-batch release
  ceremony before the collection needs it.
- **A separate website (Cloudflare/Vercel)** — GitHub Pages is already a static
  website; no backend, accounts, or upload feature is required yet.

## Consequences

- Two repos and one interface. Changing the manifest columns or paths requires
  updating `omarchy-NTE/install.sh` in the same change.
- Full-resolution images stay in plain git while the collection is small; past roughly
  30 images or 150 MB they move to Releases, and only previews + manifest stay here.
- The gallery is static and served from the repo root, so it can move to another host
  by changing the manifest's base URL — no application to port.

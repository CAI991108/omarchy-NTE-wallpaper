# vendor/

Third-party files served as-is from the static gallery. No build step copies them.

## `goatcounter-count.js`

- Source: <https://github.com/arp242/goatcounter/blob/v2.7.0/public/count.js>
- Version: pinned to tag `v2.7.0` (fetched 2026-10-28)
- Licence: ISC (header retained in the file)
- Why vendored: `gc.zgo.at` is unreachable from some networks (verified timing out on
  2026-10-28), and third-party analytics hosts are commonly blocked by ad blockers. Serving
  the same script from this origin keeps page views working; it still posts to
  `https://zijincai.goatcounter.com/count`.
- Updating: fetch the new tag's `public/count.js`, replace the file, update this note, then
  check the badge still renders and a download click still records
  (`/counter/download.json`).

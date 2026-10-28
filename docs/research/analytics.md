# Analytics for the wallpaper gallery

**Status:** researched 2026-10-28; **GoatCounter chosen** and wired in `gallery.js`
(`GOATCOUNTER_CODE = 'zijincai'`). `count.js` is vendored at `vendor/goatcounter-count.js`
(ISC, pinned to tag v2.7.0) because `gc.zgo.at` timed out on the target network; it still
posts to the hosted `zijincai.goatcounter.com`.
**Question:** which analytics provider should count (a) page views and (b) per-wallpaper
download clicks on a static GitHub Pages gallery, while staying privacy-friendly,
free/cheap, and low-maintenance?
**Scope:** plain HTML/CSS/JS, no build step, no backend, 7 images, same-origin
`<a download href="wallpapers/...">下载</a>`, assumed < 10k pageviews/month.

## TL;DR

**Use GoatCounter (hosted).** The only provider here that gives you *both* per-click events
and a **public, unauthenticated counter endpoint** to read counts back onto the page — at $0,
cookie-free, ~3.5 KB, no build step ([goatcounter.com](https://www.goatcounter.com/),
[counter docs](https://www.goatcounter.com/help/visitor-counter)). Events cost one extra
attribute per download link.
**Runner-up:** Plausible Cloud Starter ($9/mo at the 10k tier) for the best dashboard and
EU-only hosting; or Umami Cloud Hobby (free) if you want event *properties* without paying —
but Umami's free tier has no API, so no read-back.
**Cloudflare Web Analytics cannot do (b):** no custom events, "not yet"
([CF FAQ](https://developers.cloudflare.com/web-analytics/faq/)). **GA4** fails the
"privacy-friendly, low-maintenance" bar.

## Comparison

| Provider | Pageviews | Download events (per wallpaper id) | Cookies / privacy | Free tier | Self-host | Ops |
|---|---|---|---|---|---|---|
| **GoatCounter** hosted | JS tag, counts *visits* not raw loads; SPA hook documented | `data-goatcounter-click="download-01-nanally"`; event name = path; no event properties | No cookies/localStorage/cache; IP+UA only in RAM ≤8 h; aggregate-only storage | Yes, "free for reasonable public usage" (no published number) | Yes, single Go binary + SQLite/Postgres | ~none hosted |
| **Plausible** Cloud | 2.5 KB script; SPA support documented | **auto file-download tracking** (enable, add `jpeg` to `fileExtensions`); per-file URL filter; custom props = Business plan | No cookies/storage; daily salted hash; EU-only | 30-day trial only | CE, AGPLv3 | Hosted none; CE = server, DB, twice-yearly LTS upgrades |
| **Umami** Cloud | Tracker script; SPA supported by tracker | `data-umami-event="Download"` + `data-umami-event-id="…"`; names ≤50 chars | Cookie-free premise; US or EU region; 6 mo retention on Hobby | Yes, Hobby plan | Yes, same code | Hosted none; self-host Node + Postgres |
| **Cloudflare WA** | Beacon, Performance API; SPA routes measured | **None** — custom events "not yet" | "Does not collect or use visitors' personal data"; cookieless claim not explicit on pages fetched | Free on all plans | No | Lowest, but no per-file data |
| **GA4** | gtag.js; SPA needs manual `page_view` | `gtag('event','download',{...})`; full params | Client identifiers + consent machinery; not privacy-first | Standard GA4 free (price page unverified) | No | Highest: consent, tag config, API auth |

## Per-provider notes

### GoatCounter (hosted, self-hosted)

- **Pageviews.** `<script data-goatcounter="https://MYCODE.goatcounter.com/count" async src="//gc.zgo.at/count.js">`;
  "~3.5KB" of extra data ([homepage](https://www.goatcounter.com/)). It counts **visits**: a
  reload or revisit within 8 h is one visit unless sessions are disabled
  ([sessions](https://www.goatcounter.com/help/sessions)) — disable them for raw pageviews.
- **SPA.** `window.goatcounter = {no_onload: true}` + `goatcounter.count({path})` on route
  change ([SPA](https://www.goatcounter.com/help/spa)); not needed for this one-pager.
- **Events.** Auto-binds clicks on `data-goatcounter-click`; the attribute value becomes the
  event name, and `path` *is* the event name. There is **no property/param field**: "There is
  currently no real way to record the path with the event", so encode the id in the name.
  Names must not start with `/`; `data-goatcounter-title` (≤200 chars) carries a label
  ([events](https://www.goatcounter.com/help/events)). JS form:
  `goatcounter.count({path: 'download-01-nanally', event: true})`.
- **Read-back.** Yes — the standout. `GET /counter/<path>.json` returns `{count:"1,234"}`,
  supports `TOTAL`, needs **no auth**, but requires enabling "Allow adding visitor counts on
  your website" in site settings (default off); cached up to 4 h; same route serves `html`,
  `svg`, `png` counters ([counter docs](https://www.goatcounter.com/help/visitor-counter)).
  The authenticated JSON API (`/api/v0/stats/*`, Bearer key, 4 req/s) is for dashboards
  ([API](https://www.goatcounter.com/help/api)).
- **Cost.** Hosted is donation-supported, "currently offered for free for reasonable public
  usage"; no published numeric quota; self-host for heavier use
  ([homepage](https://www.goatcounter.com/)).
- **Privacy.** No cookies, localStorage, cache or tracker ID; site+IP+User-Agent mapped in
  memory ≤8 h, never written to disk; aggregate tables only; Hetzner Finland/Germany;
  backups ≤30 days ([privacy](https://www.goatcounter.com/help/privacy)). Vendor: consent
  notice "probably" not required ([GDPR](https://www.goatcounter.com/help/gdpr)). It
  documents that it *ignores* Do Not Track (linked from its docs).
- **CSP.** `script-src https://gc.zgo.at` + `connect-src https://MYCODE.goatcounter.com/count`
  ([CSP](https://www.goatcounter.com/help/csp)); GitHub Pages cannot send headers, so this
  only matters if you add a `<meta http-equiv>` CSP.
- **Licence / bots.** Open source under a modified **EUPL-1.2** (the server); the injected
  `count.js` is **ISC** so sites can embed it freely
  ([LICENSE](https://github.com/arp242/goatcounter/blob/main/LICENSE)). Server-side bot
  filtering exists, scope undocumented on the pages fetched; whether `gc.zgo.at` is on
  adblock lists is **unconfirmed**.

### Plausible (Cloud, Community Edition)

- **Pageviews.** 2.5 KB script (vendor's measure; GA4 claimed at 135 KB gzipped)
  ([lightweight](https://plausible.io/lightweight-web-analytics)). No cookies, cache or
  localStorage; visitors = `hash(daily_salt + domain + ip + user_agent)`, salt deleted every
  24 h ([data policy](https://plausible.io/data-policy)).
- **Events.** CSS class `plausible-event-name=Download`, or
  `plausible('Download', {props: {id: '01-nanally'}})`
  ([custom events](https://plausible.io/docs/custom-event-goals)). Events **count toward
  billable pageviews**; a matching **goal must be created in the dashboard by exact name** or
  nothing shows; past events are not backfilled. Tagged `<a>` elements get their `href`
  auto-attached as a `url` property.
- **Downloads without code.** Plausible auto-tracks clicks on same-domain links whose path ends
  in a tracked file extension and exposes a `File Download` goal; `.jpeg` is **not** in the
  default list, so add it via `fileDownloads.fileExtensions: ['jpeg']` (or the site setting's
  custom list). Filtering by one file's URL is built in
  ([file downloads](https://plausible.io/docs/file-downloads-tracking)). These clicks count
  toward billable pageviews; files opened from a direct link outside the site are not counted.
- **Name/param limits.** No event-name length cap stated on that page; custom **properties**
  cap at 30 per event, 300-char names, 2000-char values, and are a **Business-plan feature**
  ([custom props](https://plausible.io/docs/custom-props/introduction)) — on Starter you get
  7 goals (`Download 01-nanally`, …) or you pay for Business.
- **Read-back.** No public counter endpoint documented. The Stats API is a **Business**
  feature ("600 requests per hour") and is authenticated
  ([pricing](https://plausible.io/#pricing)) — embedding it in static JS would leak a key.
- **Cost (monthly, 10k-pageview tier).** Starter **$9** (1 site), Growth **$14** (3 sites,
  3 users), Business **$19** (custom properties, Stats API), Enterprise custom; yearly saves
  2 months; 30-day trial, no free tier ([pricing](https://plausible.io/#pricing),
  [plans](https://plausible.io/docs/subscription-plans)).
- **Self-host.** Community Edition, **AGPLv3**, long-term releases twice a year; lacks
  funnels, journeys, revenue goals, SSO, sites API, and has only *basic* bot filtering — you
  own server, backups, upgrades, security
  ([self-hosted](https://plausible.io/self-hosted-web-analytics)).
- **Privacy.** Estonian entity, all visitor data processed/stored in the EU; vendor states no
  consent banner needed for analytics ([data policy](https://plausible.io/data-policy)). DNT
  handling: **unconfirmed**.

### Umami (Cloud, self-hosted)

- **Events.** `data-umami-event="Download"` + `data-umami-event-id="01-nanally"` (lands in the
  **Properties** tab), or `umami.track('Download', {id})`. Limits: **names ≤50 chars**; event
  data requires a name; data attributes stringify, JS keeps types
  ([track events](https://docs.umami.is/docs/track-events)).
- **Read-back.** API access is **Pro/Business/Enterprise only** on Cloud, *not* Hobby — no
  read-back on the free plan ([Cloud](https://docs.umami.is/docs/cloud)); self-hosted
  includes API access. No public unauthenticated counter documented.
- **Cost.** Hobby **$0**: up to **100k events/month**, 1 website, 6-month retention,
  community support. Pro **$20/mo**: 1M events included, 20 websites, API/MCP access, 2-year
  retention. Business **$200/mo**: 10M events, unlimited sites, replays/heatmaps, 5-year
  retention; paid plans have a 14-day trial ([pricing](https://umami.is/pricing),
  [subscription](https://docs.umami.is/docs/cloud/subscription)).
- **Privacy.** Cookie-free tracker is the product premise; Cloud offers **US or EU** region at
  signup, noting CDN/support/logging may leave it
  ([FAQ](https://docs.umami.is/docs/cloud/faq)). IP handling: **unconfirmed**.
- **Self-host / licence / blockers.** MIT-licensed
  ([repo](https://github.com/umami-software/umami)); same features self-hosted, infrastructure
  is yours ([Cloud](https://docs.umami.is/docs/cloud)). Docs ship a "Bypass ad blockers" page —
  known issue, not a guarantee.

### Cloudflare Web Analytics

- **Pageviews only.** Performance API beacon; SPA route changes measured, with documented loss
  when the final payload is cancelled
  ([FAQ](https://developers.cloudflare.com/web-analytics/faq/)).
- **No custom events.** "Does Web Analytics support custom events? — Not yet, but we may add
  support in the future" ([FAQ](https://developers.cloudflare.com/web-analytics/faq/)).
  Disqualifying for per-wallpaper counts.
- **Cost/limits.** Free on all plans; **10 sites** not proxied, unlimited if proxied; rules
  only for proxied sites
  ([limits](https://developers.cloudflare.com/web-analytics/limits/)).
- **Data.** Unsampled beacons kept 7 days, then aggregated to ~10 %; dashboard shows
  **6 months**; no query strings/UTM
  ([FAQ](https://developers.cloudflare.com/web-analytics/faq/)).
- **Privacy.** "Does not collect or use your visitors' personal data"
  ([about](https://developers.cloudflare.com/web-analytics/about/)); any cookie/storage use is
  not stated on the pages fetched — "cookie-free" **unconfirmed**.
- **Fit.** Lowest-effort pageview counter, but the beacon **is blocked by ad blockers and
  Brave/DuckDuckGo**, and the alternative (edge analytics) requires proxying through
  Cloudflare — impossible on GitHub Pages
  ([FAQ](https://developers.cloudflare.com/web-analytics/faq/)). Read-back is dashboard +
  authenticated GraphQL only.

### Google Analytics 4

- **Pageviews.** gtag.js; pageviews are events, SPAs need manual `page_view`. Much heavier
  (Plausible measures 135 KB gzipped vs its own 2.5 KB).
- **Events.** `gtag('event', '<event_name>', { <event_parameters> })` placed **below** the
  Google tag; verify in Realtime/DebugView
  ([set up events](https://developers.google.com/analytics/devguides/collection/ga4/events)).
  Download clicks would be `gtag('event','download',{wallpaper_id:'01-nanally'})`.
- **Name rules / param caps.** Google documents them, but the page was not retrieved here —
  **unconfirmed**. **Read-back:** Data API needs OAuth/service-account auth, not embeddable
  publicly ([Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)).
- **Cost.** Standard GA4 free, GA4 360 paid — no Google pricing page fetched, so
  **free-tier limits: unconfirmed**.
- **Privacy.** Client identifiers and consent-mode plumbing; retention settings exist (2 or
  14 months) but the help page returned truncated content — **default unconfirmed**. The
  option that most clearly needs a consent banner and the most configuration.

### Also considered (credible, not verified this pass)

Simple Analytics, Fathom and Counter.dev are credible privacy-first peers of Plausible (paid,
cookie-free). **None of their pricing, event APIs or read-back endpoints were checked against
primary sources here** — treat claims about them as unconfirmed until verified.

## Fit for this repo

Today: one `index.html`, no CSP header (GitHub Pages cannot set response headers), no build
step. `gallery.js` sets the card link (`download.href = item.file; download.download =
basename(item.file)`) and the lightbox has a second link (`#lightbox-download`). Both are
same-origin `<a download>` elements. `manifests/wallpapers.json` already carries a stable `id`
per wallpaper — attach that to events.

- **GoatCounter:** one script tag in `index.html`, one line in `card()`:
  `download.setAttribute('data-goatcounter-click', 'download-' + item.id)` (same for the
  lightbox link on open). No dashboard goal, no build step. Optional read-back: fetch
  `https://MYCODE.goatcounter.com/counter/TOTAL.json` and render into `#stats`.
- **Plausible:** script tag; downloads auto-tracked once `jpeg` is added to `fileExtensions`
  (a `File Download` goal appears by itself; filter by file URL for per-wallpaper counts). No
  per-link code, but $9/mo, counts toward pageviews, and per-id custom properties need Business.
- **Umami:** `data-umami-event` / `data-umami-event-id` attributes (or `umami.track`), then
  read the Properties tab; free tier has no API for read-back.
- **Cloudflare:** one script tag, pageviews only. **GA4:** gtag + consent banner + event code
  + GA UI reporting.

### Clicks vs downloads — read before trusting the numbers

Every client-side option counts **clicks on the download link**, not completed downloads:

- The event fires on activation; the transfer can still fail or be cancelled. Plain HTML gives
  no completion callback for a same-origin `download` link.
- **Missed entirely:** direct hits on
  `https://cai991108.github.io/omarchy-NTE-wallpaper/wallpapers/<theme>/<id>.<ext>`,
  `curl`/`wget`, `install.sh --wallpapers` (downloads files without loading the page), and
  right-click → "Save image as…" (no `click` on the anchor).
- **Missed by blockers:** if the script is blocked, clicks happen and are never recorded.
  Cloudflare's beacon is explicitly blocked by common blockers
  ([CF FAQ](https://developers.cloudflare.com/web-analytics/faq/)).
- **Dedup:** Plausible/Umami record one event per click; GoatCounter dedupes repeated
  identical events within a session unless `data-goatcounter-no-session="1"`
  ([events](https://www.goatcounter.com/help/events)). GoatCounter also gives you no extra
  context beyond the event name — always encode the id in it.

So download numbers are a **relative popularity signal** (which wallpaper people click), not
bandwidth or install counts. True download counts need server-side logs, which GitHub Pages
does not provide (a Cloudflare proxy + log push would mean a different architecture).

## Recommendation

1. **GoatCounter hosted**, one script tag + one attribute per download link. Free, cookie-free,
   ~3.5 KB, no build step, no dashboard goal to maintain, and the only public JSON counter you
   can render without shipping a secret. Event names `download-<id>`, id from
   `wallpapers.json`.
2. **If you outgrow "reasonable usage" or want to own the data:** self-host GoatCounter
   (single binary + SQLite) — lighter ops than Plausible CE (Postgres, twice-yearly LTS
   upgrades) or Umami (Node + Postgres).
3. **If you would rather pay for polish:** Plausible Cloud Starter $9/mo is the best UX and
   EU-only hosting; budget Business $19/mo for per-wallpaper properties instead of 7 goal
   names. **Umami Cloud Hobby** is the free fallback if you want properties but no read-back
   and accept 6-month retention.
4. **Skip Cloudflare (no events) and GA4** (weight, consent, maintenance).

## Open questions

- **Display counts on the page?** Only GoatCounter makes this a ~5-line change. Total-views
  badge in `#stats`, per-wallpaper counts on cards, or nothing public?
- **Hosted vs self-hosted?** Hosted = zero ops but donation-funded, no SLA. Self-host = a VPS
  plus backups and upgrades you must actually do.
- **Visits vs pageviews:** leave GoatCounter sessions on (deduped) or off (raw loads)? This
  changes what the numbers mean.
- **Goal naming:** `download-<id>` (GoatCounter-style) vs `Download` + property (Plausible
  Business/Umami). Decide before implementing so historic data stays comparable.
- **Confirm before committing:** GA4 event-name rules and free-tier limits; DNT for
  Plausible/Umami/Cloudflare; whether GoatCounter's script domain is on adblock lists.

## Sources (all accessed 2026-10-28)

- **GoatCounter:** [home](https://www.goatcounter.com/) · [events](https://www.goatcounter.com/help/events) · [counter JSON](https://www.goatcounter.com/help/visitor-counter) · [sessions](https://www.goatcounter.com/help/sessions) · [privacy](https://www.goatcounter.com/help/privacy) · [GDPR](https://www.goatcounter.com/help/gdpr) · [CSP](https://www.goatcounter.com/help/csp) · [SPA](https://www.goatcounter.com/help/spa) · [API](https://www.goatcounter.com/help/api) · [repo](https://github.com/arp242/goatcounter) · [LICENSE](https://github.com/arp242/goatcounter/blob/main/LICENSE)
- **Plausible:** [pricing](https://plausible.io/#pricing) · [plans](https://plausible.io/docs/subscription-plans) · [custom events](https://plausible.io/docs/custom-event-goals) · [custom props](https://plausible.io/docs/custom-props/introduction) · [file downloads](https://plausible.io/docs/file-downloads-tracking) · [Events API](https://plausible.io/docs/events-api) · [data policy](https://plausible.io/data-policy) · [lightweight](https://plausible.io/lightweight-web-analytics) · [CE](https://plausible.io/self-hosted-web-analytics)
- **Umami:** [pricing](https://umami.is/pricing) · [track events](https://docs.umami.is/docs/track-events) · [Cloud](https://docs.umami.is/docs/cloud) · [Cloud FAQ](https://docs.umami.is/docs/cloud/faq) · [subscription](https://docs.umami.is/docs/cloud/subscription) · [repo](https://github.com/umami-software/umami)
- **Cloudflare:** [overview](https://developers.cloudflare.com/web-analytics/) · [about](https://developers.cloudflare.com/web-analytics/about/) · [FAQ](https://developers.cloudflare.com/web-analytics/faq/) · [limits](https://developers.cloudflare.com/web-analytics/limits/) · [data origin](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/)
- **Google:** [set up events](https://developers.google.com/analytics/devguides/collection/ga4/events) · [Data API](https://developers.google.com/analytics/devguides/reporting/data/v1) · [data retention](https://support.google.com/analytics/answer/7667196)

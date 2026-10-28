(() => {
  'use strict';

  const grid = document.getElementById('grid');
  const filters = document.getElementById('filters');
  const search = document.getElementById('search');
  const stats = document.getElementById('stats');
  const popularity = document.getElementById('popularity');
  const empty = document.getElementById('empty');
  const error = document.getElementById('error');
  const dialog = document.getElementById('lightbox');
  const dialogImg = document.getElementById('lightbox-img');
  const dialogTitle = document.getElementById('lightbox-title');
  const dialogMeta = document.getElementById('lightbox-meta');
  const dialogDownload = document.getElementById('lightbox-download');
  const dialogSource = document.getElementById('lightbox-source');

  const state = { items: [], theme: 'all', query: '' };
  let dialogItem = null;

  const MB = 1024 * 1024;
  const fmtMB = (bytes) => `${(bytes / MB).toFixed(1).replace(/\.0$/, '')} MB`;
  const basename = (path) => path.split('/').pop();

  // ── analytics (GoatCounter) ────────────────────────────────────────────────
  // Site code from https://www.goatcounter.com (site: <code>.goatcounter.com).
  // Empty string = analytics fully off: no script tag, no network requests.
  const GOATCOUNTER_CODE = 'zijincai';
  const GC_BASE = GOATCOUNTER_CODE ? `https://${GOATCOUNTER_CODE}.goatcounter.com` : '';

  function trackDownload(item) {
    if (!GC_BASE || !window.goatcounter?.count) return;
    // Recorded as normal paths (not events) so the public counter endpoint can
    // read them back for the badge; they show under Pages in the dashboard.
    window.goatcounter.count({ path: `download-${item.id}`, title: `Download ${item.id}` });
    window.goatcounter.count({ path: 'download', title: 'Download' });
    // The hit is persisted within ~10 s; refresh the badge after that.
    setTimeout(maybeShowCounts, 15000);
  }

  async function counter(path) {
    // GoatCounter stores paths lower-cased; an upper-case path 404s even when it
    // has data. count.js sends the page path as-is, so normalise it here.
    const response = await fetch(`${GC_BASE}/counter/${encodeURIComponent(path.toLowerCase())}.json`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()).count;
  }

  // Public counters need "Allow adding visitor counts" in GoatCounter's site
  // settings; if that is off, or the request fails, the badge stays hidden.
  //
  // The aggregate `/download` path is deliberately not read back: its public
  // counter can get a stale 404 cached for hours before the first download.
  // Per-wallpaper `/download-<id>` counters are fresh and sum to the total.
  async function showPopularity() {
    if (!GC_BASE || !popularity || !state.items.length) return;
    // Use the exact path count.js recorded (it may have a trailing slash).
    const pagePath = window.goatcounter?.get_data?.().p || location.pathname;
    const ids = state.items.map((item) => item.id);
    const results = await Promise.allSettled([
      counter(pagePath),
      ...ids.map((id) => counter(`/download-${id}`)),
    ]);
    const views = results[0];
    const parts = [];
    if (views.status === 'fulfilled') parts.push(`浏览 ${views.value} 次`);
    let total = 0;
    let anyDownloads = false;
    for (const result of results.slice(1)) {
      if (result.status !== 'fulfilled') continue;
      anyDownloads = true;
      total += Number(String(result.value).replace(/,/g, '')) || 0;
    }
    if (anyDownloads) parts.push(`下载 ${total} 次`);
    if (!parts.length) return;
    popularity.textContent = parts.join(' · ');
    popularity.hidden = false;
  }

  let dataLoaded = false;
  let analyticsLoaded = false;
  let popularityBusy = false;

  function maybeShowCounts() {
    if (!dataLoaded || !analyticsLoaded || popularityBusy || !GC_BASE) return;
    popularityBusy = true;
    showPopularity().finally(() => { popularityBusy = false; });
  }

  function initAnalytics() {
    if (!GC_BASE) return;
    const script = document.createElement('script');
    script.async = true;
    // Vendored same-origin: gc.zgo.at is unreachable on some networks.
    script.src = 'vendor/goatcounter-count.js';
    script.dataset.goatcounter = `${GC_BASE}/count`;
    script.addEventListener('load', () => {
      analyticsLoaded = true;
      maybeShowCounts();
    });
    document.head.append(script);
  }

  function labelFor(theme) {
    const item = state.items.find((i) => i.theme === theme);
    return item ? item.themeLabel : theme;
  }

  function buildFilters() {
    filters.replaceChildren();
    const themes = [...new Set(state.items.map((i) => i.theme))];

    addFilter('all', `全部 (${state.items.length})`);
    for (const theme of themes) {
      const n = state.items.filter((i) => i.theme === theme).length;
      addFilter(theme, `${labelFor(theme)} (${n})`);
    }
  }

  function addFilter(theme, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter';
    button.textContent = label;
    button.dataset.theme = theme;
    button.setAttribute('aria-pressed', String(state.theme === theme));
    button.addEventListener('click', () => {
      state.theme = theme;
      for (const b of filters.children) {
        b.setAttribute('aria-pressed', String(b.dataset.theme === theme));
      }
      render();
    });
    filters.append(button);
  }

  function visibleItems() {
    const q = state.query.trim().toLowerCase();
    return state.items.filter((item) => {
      if (state.theme !== 'all' && item.theme !== state.theme) return false;
      if (!q) return true;
      return [item.title, item.id, item.themeLabel, item.credit]
        .some((value) => (value || '').toLowerCase().includes(q));
    });
  }

  function render() {
    const items = visibleItems();
    grid.replaceChildren();

    if (state.items.length === 0) {
      empty.hidden = false;
      stats.textContent = '';
      return;
    }
    empty.hidden = true;

    if (items.length === 0) {
      stats.textContent = '没有匹配的壁纸。';
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const item of items) fragment.append(card(item));
    grid.append(fragment);

    const total = items.reduce((sum, item) => sum + (item.bytes || 0), 0);
    stats.textContent = `${items.length} 张 · 共 ${fmtMB(total)} · 点击图片看大图`;
  }

  function card(item) {
    const article = document.createElement('article');
    article.className = 'card';

    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb';
    thumb.setAttribute('aria-label', `查看大图：${item.title}`);

    const img = document.createElement('img');
    img.src = item.preview;
    img.alt = item.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => {
      img.alt = `预览缺失：${item.preview}`;
    });
    thumb.append(img);
    thumb.addEventListener('click', () => openDialog(item));

    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = item.title;

    const meta = document.createElement('p');
    meta.className = 'card-meta';
    meta.textContent = `${item.themeLabel} · ${item.width}×${item.height} · ${fmtMB(item.bytes)}`;

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const download = document.createElement('a');
    download.className = 'button';
    download.href = item.file;
    download.download = basename(item.file);
    download.textContent = '下载';
    download.addEventListener('click', () => trackDownload(item));

    const details = document.createElement('button');
    details.type = 'button';
    details.className = 'button ghost';
    details.textContent = '详情';
    details.addEventListener('click', () => openDialog(item));

    actions.append(download, details);
    body.append(title, meta, actions);
    article.append(thumb, body);
    return article;
  }

  function openDialog(item) {
    dialogItem = item;
    dialogImg.src = item.file;
    dialogImg.alt = item.title;
    dialogTitle.textContent = item.title;
    dialogMeta.textContent =
      `${item.themeLabel} · ${item.width}×${item.height} · ${fmtMB(item.bytes)} · ${item.id}`;

    dialogDownload.href = item.file;
    dialogDownload.download = basename(item.file);

    if (item.source && /^https?:\/\//i.test(item.source)) {
      dialogSource.href = item.source;
      dialogSource.hidden = false;
    } else {
      dialogSource.hidden = true;
      dialogSource.removeAttribute('href');
    }

    dialog.showModal();
  }

  // Click on the backdrop (the dialog element itself, not its children) closes it.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialogDownload.addEventListener('click', () => {
    if (dialogItem) trackDownload(dialogItem);
  });

  search.addEventListener('input', () => {
    state.query = search.value;
    render();
  });

  async function load() {
    try {
      const response = await fetch('manifests/wallpapers.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      state.items = Object.entries(data.sets || {}).flatMap(([theme, set]) =>
        (set.wallpapers || []).map((wallpaper) => ({
          ...wallpaper,
          theme,
          themeLabel: set.label || theme,
        })),
      );

      buildFilters();
      render();
      dataLoaded = true;
      maybeShowCounts();
    } catch (err) {
      error.hidden = false;
      error.textContent =
        `画廊数据加载失败（${err.message}）。` +
        '请通过 HTTP 打开本页，例如在仓库根目录运行 python3 -m http.server。';
      stats.textContent = '';
    }
  }

  load();
  initAnalytics();
})();

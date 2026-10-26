(() => {
  'use strict';

  const grid = document.getElementById('grid');
  const filters = document.getElementById('filters');
  const search = document.getElementById('search');
  const stats = document.getElementById('stats');
  const empty = document.getElementById('empty');
  const error = document.getElementById('error');
  const dialog = document.getElementById('lightbox');
  const dialogImg = document.getElementById('lightbox-img');
  const dialogTitle = document.getElementById('lightbox-title');
  const dialogMeta = document.getElementById('lightbox-meta');
  const dialogDownload = document.getElementById('lightbox-download');
  const dialogSource = document.getElementById('lightbox-source');

  const state = { items: [], theme: 'all', query: '' };

  const MB = 1024 * 1024;
  const fmtMB = (bytes) => `${(bytes / MB).toFixed(1).replace(/\.0$/, '')} MB`;
  const basename = (path) => path.split('/').pop();

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
    } catch (err) {
      error.hidden = false;
      error.textContent =
        `画廊数据加载失败（${err.message}）。` +
        '请通过 HTTP 打开本页，例如在仓库根目录运行 python3 -m http.server。';
      stats.textContent = '';
    }
  }

  load();
})();

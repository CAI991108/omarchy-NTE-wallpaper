# omarchy-NTE-wallpaper

**NTE wallpapers for Omarchy.** Seven originals, two themes, one command.

七张《异环》壁纸，两个主题，一条命令装进 Omarchy 的壁纸选择器。

[![pages](docs/assets/badges/pages.svg)](https://cai991108.github.io/omarchy-NTE-wallpaper/) [![license](docs/assets/badges/license.svg)](LICENSE) [![7 wallpapers · 2 themes](docs/assets/badges/collection.svg)](manifests/wallpapers.tsv)

<p>
  <img src="previews/catppuccin/01-nanally.webp" width="330" alt="娜娜莉">
  <img src="previews/catppuccin-latte/01-nte-chibi.webp" width="330" alt="异环·Q版群像">
  <img src="previews/catppuccin-latte/02-nte-sakura.webp" width="330" alt="异环·全家福">
  <img src="previews/catppuccin/03-nanally-dusk.webp" width="330" alt="娜娜莉·黄昏">
  <img src="previews/catppuccin/04-nanally-rain.webp" width="330" alt="娜娜莉·雨">
  <img src="previews/catppuccin/05-requiem-rain.webp" width="330" alt="安魂曲·雨">
</p>

## 安装

```bash
cd ~/omarchy-NTE && ./install.sh --wallpapers=catppuccin
```

只装壁纸，不动其余配置。`--wallpapers` 装当前主题，`--wallpapers=all` 装全部主题；先看计划不联网就加 `--dry-run`。

## 画廊

<img src="docs/assets/gallery.webp" width="1000" alt="壁纸画廊：主题筛选、搜索、单张下载">

<https://cai991108.github.io/omarchy-NTE-wallpaper/>

按主题筛选、搜索、单张下载，不用 clone 本仓库。页面只加载 640px 缩略图，点开大图或下载才取原图。

## 主题

| 主题目录 | 张数 | 分辨率 | 内容 |
|---|---|---|---|
| `catppuccin` | 5 | 4199×2362 · 3648×2496 | 娜娜莉系列 4 张 + 安魂曲·雨 |
| `catppuccin-latte` | 2 | 3840×2160 | 异环官方 16:9 全家福与 Q 版群像 |

装好后按 <kbd>Super</kbd> + <kbd>Ctrl</kbd> + <kbd>Space</kbd> 在桌面端切换（Omarchy 3.8.2；4.x 为 <kbd>Super</kbd> + <kbd>Ctrl</kbd> + <kbd>W</kbd>）。

## 它怎么工作

本仓库只放图片与清单，部署逻辑在 [omarchy-NTE](https://github.com/CAI991108/omarchy-NTE)。两者之间只有一份接口：`manifests/wallpapers.tsv`。

```text
omarchy-NTE/install.sh --wallpapers=catppuccin
  │
  ├─ GET  manifests/wallpapers.tsv        唯一接口，12 列
  ▼
  过滤 theme == catppuccin
  │
  ├─ GET  wallpapers/<theme>/<id>.<ext>   校验 sha256/bytes
  ├─ ✗ 校验失败 → 跳过该张并警告，不中断部署
  └─ install  ~/.config/omarchy/backgrounds/<theme>/<basename>
       └─ 扁平存放：Omarchy 只扫 find -maxdepth 1
```

## 素材来源

7 张壁纸的版权均归原作者 / 发行方，**不在代码的 MIT 许可范围内**。

- **2 张**取自《异环》官方发布（`01-nte-chibi`、`02-nte-sakura`），出处见 [CREDITS.md](CREDITS.md)。
- **5 张**是同人二创（娜娜莉系列与安魂曲·雨），原作者未知、未获授权，仅作个人桌面使用收录。**收到权利人请求会立即删除对应文件**，无需解释。

逐张作者与来源见 [CREDITS.md](CREDITS.md)。

## 参与

<details>
<summary><b>加一张壁纸</b></summary>

```bash
# 1. 放进对应主题目录；文件名就是 Omarchy 选择器里的标题
cp ~/Pictures/foo.jpg wallpapers/catppuccin/06-foo.jpg

# 2. 在 manifests/credits.tsv 补一行：id / 标题 / bundled / 作者 / 来源
#    06-foo	自定义标题	0	作者名	https://source.example/foo

# 3. 生成缩略图、清单与 CREDITS.md
./scripts/build.sh

# 4. 提交前确认没有过期文件
./scripts/build.sh --check
```

`build.sh` 会校验文件名、算 sha256 与尺寸、用 `magick -strip` 生成 640px WebP 预览，并重写清单与 `CREDITS.md`。

</details>

<details>
<summary><b>清单契约（12 列）</b></summary>

`manifests/wallpapers.tsv` 是安装脚本与画廊之间的唯一接口，`wallpapers.json` 由它生成。改列或改路径 = 同时改 `omarchy-NTE/install.sh`。

| 列 | 含义 |
|---|---|
| `theme` | 目标主题目录名，如 `catppuccin` |
| `id` | 全局唯一，文件名去掉扩展名，`[a-z0-9-]` |
| `file` | 仓库内相对路径，如 `wallpapers/catppuccin/01-nanally.jpeg` |
| `preview` | 仓库内相对路径，如 `previews/catppuccin/01-nanally.webp` |
| `sha256` / `bytes` / `width` / `height` | 校验与展示 |
| `title` / `credit` / `source` | 显示用元数据，来自 `credits.tsv` |
| `bundled` | `1` = omarchy-NTE 已自带该图；安装时按 sha256 跳过 |

安装器落地路径是 `~/.config/omarchy/backgrounds/<theme>/<basename(file)>`——**必须扁平**。

</details>

<details>
<summary><b>约定</b></summary>

- 一个主题一个目录：`wallpapers/<theme>/<id>.<ext>`，不再套子目录。
- 文件名即标题：小写 ASCII 与连字符；中文标题只进 `credits.tsv`。
- 每张图必须有 credits 行；来源不明写 `待补`，不要编造作者或 URL。
- 入库前 `magick -strip` 去掉 EXIF；不提交 NSFW 或未署名的素材。
- 不用 Git LFS；超过约 30 张或 150 MB 时，按 [ADR](docs/adr/0001-separate-wallpaper-repo.md) 把原图迁到 GitHub Releases。
- 画廊是纯静态的：没有框架、没有构建步骤、没有后端。

维护者文档：[AGENTS.md](AGENTS.md) · 决策记录：[docs/adr](docs/adr)

</details>

## License

代码（`scripts/`、画廊页面）：[MIT](LICENSE)。壁纸版权归原作者 / 发行方所有，不在 MIT 范围内。


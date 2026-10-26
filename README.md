# omarchy-NTE-wallpaper

**Omarchy 的 NTE（异环）壁纸画廊**：在线预览、单张下载，或者按主题装进
[omarchy-NTE](https://github.com/CAI991108/omarchy-NTE) 的 Omarchy 桌面。

> **状态：初始化中。** 已接入 1 张默认壁纸（`01-nanally`），清单生成与画廊已跑通；
> GitHub Pages 和 `omarchy-NTE` 的 `install.sh --wallpapers` 是下一步。

## 画廊

部署后地址：`https://cai991108.github.io/omarchy-NTE-wallpaper/`

本地预览（静态页，需要 HTTP，不能直接双击 `file://`）：

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080/
```

画廊只加载 `previews/` 里的 640px 缩略图；点开大图和“下载”才拿原图。

## 装进 Omarchy

**手动**（现在就能用）：

```bash
install -Dm0644 wallpapers/catppuccin/01-nanally.jpeg \
  ~/.config/omarchy/backgrounds/catppuccin/
omarchy theme bg set ~/.config/omarchy/backgrounds/catppuccin/01-nanally.jpeg
```

装完按 <kbd>Super</kbd> + <kbd>Ctrl</kbd> + <kbd>Space</kbd>（Omarchy 3.8.2；
4.x 是 <kbd>Super</kbd> + <kbd>Ctrl</kbd> + <kbd>W</kbd>）在桌面端切换。

**一键安装**（配合 omarchy-NTE，开发中）：

```bash
cd ~/omarchy-NTE
./install.sh --wallpapers=catppuccin
```

## 加一张壁纸

```bash
# 1. 放进对应主题目录；文件名就是 Omarchy 选择器里的标题
cp ~/Pictures/foo.jpg wallpapers/catppuccin/02-foo.jpg

# 2. 在 manifests/credits.tsv 补一行
#    id<TAB>title<TAB>bundled<TAB>credit<TAB>source
#    02-foo	Foo	0	作者名	https://source.example/foo

# 3. 生成缩略图 + 清单 + CREDITS.md
./scripts/build.sh

# 4. 提交前确认没有过期文件
./scripts/build.sh --check
```

`scripts/build.sh` 会：校验文件名、算 sha256/尺寸/体积、`magick -strip` 生成
640px WebP 预览、重写 `manifests/wallpapers.tsv|json`、重写 `CREDITS.md`。

## 仓库结构

```text
omarchy-NTE-wallpaper/
├── wallpapers/<theme>/<id>.<ext>   # 原图；部署时扁平放进 backgrounds/<theme>/
├── previews/<theme>/<id>.webp      # 640px 缩略图（生成物，入库）
├── manifests/
│   ├── credits.tsv                 # ✍️ 唯一手填的元数据
│   ├── wallpapers.tsv              # 安装脚本读（生成物）
│   └── wallpapers.json             # 画廊读（生成物）
├── index.html  gallery.css  gallery.js
├── scripts/build.sh
├── CREDITS.md                      # 生成物
└── .nojekyll                       # Pages：跳过 Jekyll
```

## 清单契约

`manifests/wallpapers.tsv` 是安装脚本和画廊之间的唯一接口（`json` 由它生成）：

| 列 | 含义 |
|---|---|
| `theme` | 目标主题目录名，如 `catppuccin` |
| `id` | 全局唯一；文件名去掉扩展名，`[a-z0-9-]` |
| `file` | 仓库内相对路径，如 `wallpapers/catppuccin/01-nanally.jpeg` |
| `preview` | 仓库内相对路径，如 `previews/catppuccin/01-nanally.webp` |
| `sha256` / `bytes` / `width` / `height` | 校验与展示 |
| `bundled` | `1` = omarchy-NTE 已自带这张；安装时按 sha256 跳过 |
| `credit` / `source` | 作者/来源；未知写 `待补`，**不要编造** |

改列、改路径 = 同步改 `omarchy-NTE/install.sh`。安装器落到
`~/.config/omarchy/backgrounds/<theme>/<basename(file)>`——必须扁平，Omarchy
只扫 `-maxdepth 1`。

## 约定

- **文件名即标题**：Omarchy 选择器会去掉前导数字、把连字符变空格；用
  `01-nanally` 这种 ASCII 命名，中文标题只写进 `credits.tsv`。
- **只放平铺文件**：`wallpapers/<theme>/` 下不要再套子目录。
- **去 EXIF**：入库前统一 `-strip`；预览图已自动处理，原图也建议处理。
- **不公开的图不进仓库**：先在本地过一遍。
- **不用 Git LFS**：别人下载会计入仓库主的 10 GiB/月额度。图超过约 30 张或
  150 MB 时，按 `docs/adr/` 的约定把原图挪到 GitHub Releases。
- **画廊是纯静态的**：没有构建步骤、没有框架。

## Credits & License

- 代码（脚本、页面）：[MIT](LICENSE)。
- 壁纸：版权归原作者/发行方所有，**不在 MIT 范围内**；逐张来源见
  [CREDITS.md](CREDITS.md)。收到作者/版权方请求会立即删除对应文件。

# 人生轨迹 · 个人站

一个人的时间线 + 作品集。静态单页，零依赖，发到 GitHub Pages。

**线上地址：https://alantataka.github.io/life/**

- 内容全在 `content.json`，页面由 `node build.mjs` 生成
- 没有框架、没有构建链、没有 CDN；断网、`file://` 直开也能看
- 视觉：暖纸 + 淡青，衬线标题、楷体小记、纸纹底

## 页面

| 路径 | 内容 |
|---|---|
| `/` | 主页：名字 + 四样东西（关于 / 作品 / 喜爱 / 图片），位置可在编辑器里拖 |
| `/about/` | 关于：人生时间线（三阶段） |
| `/works/` | 作品：所有作品，按时间倒序 |
| `/likes/` | 喜爱：书、片子、工具（目前空状态） |
| `/photos/` | 图片：照片（目前空状态） |

主页的四样东西、背景图、缩放动效都在 `content.json` 的 `home` 段里；用编辑器改最省事。

**主页的效果**（编辑器「主页」页签，或直接在主页**右键**）：

| 效果 | 字段 | 说明 |
|---|---|---|
| 压暗程度 | `home.scrim` | 0–0.9，越大字越清楚、图越淡 |
| 鼠标聚光 | `home.spotlight` / `home.spotlightSize` | 指针附近透出原图，光圈 80–360px；关掉就是普通背景 |
| 缓慢缩放 | `home.backgroundMotion` | 背景 34 秒 3% 呼吸；系统开了「减少动态效果」自动停 |

右键菜单的选择**只存在你的浏览器**（localStorage），不会改 `content.json`、也不会影响访客；
编辑器里改的才是所有人的默认值。

## 目录

```
content.json   唯一内容源（站点信息、阶段、作品）
build.mjs      生成器：content.json → index.html
dev.mjs        开发预览：静态服务 + 自动重建 + 页面自动刷新
check.mjs      内容体检：结构/链接/占位/对比度/产物新鲜度
styles.css     设计系统（颜色、字号、纸纹、打印样式）
index.html     生成物，别手改
assets/        图片（作品封面、纸纹 paper.png）
tools/         make-paper.mjs：重新生成纸纹
```

## 改内容

### 办法一：表单编辑（不用碰 JSON）

```powershell
node dev.mjs        # 起服务
```

打开 **http://127.0.0.1:4173/.dev/editor/**

1. 点右上角「连接 site 文件夹」，选到 `E:\dsh-demo\site`
2. 在「站点 / 主页 / 阶段 / 风格」四个页签里改：改字、拖动主页入口、加删阶段、加删作品、换封面图、改配色和字体
3. 点「保存」→ 写回 `content.json`（和 `styles.css`），页面自动重建
4. 点「打开预览」看效果
5. 满意了再推送：

```powershell
git add content.json index.html styles.css assets about works likes photos
git commit -m "改内容"
git push
```

> 上传图片会自动压到 300KB 以内（透明图转 WebP，照片转 JPEG，宽度最多 1920），
> 压完会提示「压到 xxxKB」。压不下来才会拒绝。

> 编辑器只认 Chrome / Edge（用到 File System Access API），而且只能在 `node dev.mjs` 起的
> 本地服务下打开，`file://` 打不开。它不进仓库（`.gitignore` 里的 `.dev/`），不影响线上站点。

### 办法二：直接改 `content.json`

只改 `content.json`，然后 `node build.mjs` 重新生成。字段：

| 字段 | 说明 |
|---|---|
| `site.title` | 浏览器标签标题 |
| `site.name` | 首屏大标题（你的名字） |
| `site.tagline` | 一行自我介绍 |
| `site.intro` | 首屏那段手记（楷体显示） |
| `site.email` / `site.github` | 联系方式 |
| `site.location` | 小眉里的地点 |
| `site.footerNote` | 页尾那句话 |
| `stages[].period` | 左侧年份，如 `2014 — 2018` |
| `stages[].title` | 这一阶段的一句话概括 |
| `stages[].place` | 地点 · 身份 |
| `stages[].summary` | 两三句：在哪、做了什么、为什么走到今天 |
| `stages[].quote` | 可选，一句手记（楷体） |
| `stages[].achievements` | 成果列表，动词开头，尽量带数字 |
| `stages[].works[]` | 作品：`title` / `role` / `year` / `summary` / `link` / `tag` / `image` |

作品的 `link` 写 `"#"` 就是不可点；`image` 放 `assets/` 下的相对路径（4:3 最贴合）。
占位文案一律带「示例」二字，发布前要清干净。

## 本地看

```powershell
node dev.mjs        # http://127.0.0.1:4173/ ，改完保存自动刷新
node dev.mjs 5000   # 换端口
```

只想要一次性生成：`node build.mjs`。

## 体检

```powershell
node check.mjs            # 有错误时退出码 1
node check.mjs --strict   # 把「示例/占位」也算错误，发布前用
```

它会查：`content.json` 结构、链接格式、图片存在与大小、`index.html` 是否过期、
外链 `rel`、图片 `alt`、`:root` 之外的十六进制、文字对比度、CSS 引用的图片是否存在。

## 发布

```powershell
git init
git add .
git commit -m "site: initial"
gh repo create <仓库名> --public --source . --push
```

GitHub → Settings → Pages → Source 选 `Deploy from a branch`、`main` / `root`。
之后每次改完 `node build.mjs`，提交 `index.html` 与 `content.json` 即可。

## 约定

1. 不装依赖。`build.mjs` / `dev.mjs` / `check.mjs` 只用 node 自带模块。
2. 颜色字号只从 `styles.css` 的 `:root` 取，别处不写十六进制。
3. 不编造事实——年份、数字、奖项必须来自本人。
4. 不加动画库、玻璃拟态、渐变。这个站的克制就是它的气质。

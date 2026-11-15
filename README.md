# 人生轨迹 · 个人站

一个人的时间线 + 作品集。静态单页，零依赖，发到 GitHub Pages。

**线上地址：https://alantataka.github.io/life/**

- 内容全在 `content.json`，页面由 `node build.mjs` 生成
- 没有框架、没有构建链、没有 CDN；断网、`file://` 直开也能看
- 视觉：暖纸 + 淡青，衬线标题、楷体小记、纸纹底

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

只改 `content.json`，然后重新生成。字段：

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

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(join(here, 'content.json'), 'utf8'))
const s = data.site
const home = data.home || { objects: [] }

const esc = (v = '') =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const safeUrl = (v = '') => (/^https?:\/\//i.test(v) ? v : '#')
const initials = (title) => String(title).replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '').slice(0, 2) || '作品'

/** 子页面里的图片路径要加 ../ */
const asset = (p = '', prefix = '') => (p.startsWith('assets/') ? prefix + p : p)

// ---------- 共享片段 ----------

const PAGES = [
  ['home', '主页', ''],
  ['about', '关于', 'about/'],
  ['works', '作品', 'works/'],
  ['likes', '喜爱', 'likes/'],
  ['photos', '图片', 'photos/']
]

const head = ({ title, desc, prefix }) => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta name="robots" content="noindex, nofollow" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:type" content="profile" />
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#3B4247"/><circle cx="32" cy="32" r="9" fill="#8FBFA6"/></svg>`
)}" />
<link rel="stylesheet" href="${prefix}styles.css" />
</head>`

const navBar = (prefix, current) => `
  <nav class="site-nav" aria-label="主导航">
    ${PAGES.filter(([k]) => k !== 'home')
      .map(([key, label, path]) => `<a href="${prefix}${path}"${key === current ? ' aria-current="page"' : ''}>${label}</a>`)
      .join('')}
    <a href="${prefix}" class="home-link">主页</a>
  </nav>`

const footer = (prefix) => `
  <footer class="footer">
    <p class="footer-note">${esc(s.footerNote)}</p>
    ${
      s.github
        ? `<p class="footer-links"><a href="${esc(safeUrl(s.github))}" target="_blank" rel="noopener noreferrer">GitHub</a></p>`
        : ''
    }
    <p class="copyright">© ${new Date().getFullYear()} ${esc(s.name)}</p>
  </footer>`

const skipLink = `<a class="skip-link" href="#main">跳到正文</a>`

// ---------- 作品 / 阶段 ----------

const renderWork = (w, prefix = '') => {
  const thumb = w.image
    ? `<img src="${esc(asset(w.image, prefix))}" alt="${esc(w.title)} 的封面" loading="lazy" />`
    : `<span class="thumb-fallback" aria-hidden="true">${esc(initials(w.title))}</span>`
  return `
        <a class="work" href="${esc(safeUrl(w.link))}" target="_blank" rel="noopener noreferrer">
          <span class="work-thumb">${thumb}</span>
          <span class="work-body">
            <span class="work-head">
              <span class="work-title">${esc(w.title)}</span>
              ${w.year ? `<span class="work-year">${esc(w.year)}</span>` : ''}
            </span>
            <span class="work-meta">${esc(w.role)}${w.tag ? ' · ' + esc(w.tag) : ''}</span>
            <span class="work-summary">${esc(w.summary)}</span>
          </span>
          <span class="work-go" aria-hidden="true">打开 →</span>
        </a>`
}

const renderStage = (st, idx, prefix = '') => `
      <section class="stage" id="${esc(st.id || 'stage-' + (idx + 1))}">
        <div class="stage-year">
          <span class="year">${esc(st.period)}</span>
          <span class="place">${esc(st.place || '')}</span>
        </div>
        <div class="stage-rail" aria-hidden="true">
          <span class="stage-dot"></span>
        </div>
        <div class="stage-card">
          <h2 class="stage-title">${esc(st.title)}</h2>
          <p class="stage-summary">${esc(st.summary)}</p>
          ${st.quote ? `<blockquote class="stage-quote">${esc(st.quote)}</blockquote>` : ''}
          ${
            (st.achievements || []).length
              ? `<ul class="achievements">${st.achievements.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`
              : ''
          }
          ${(st.works || []).length ? `<div class="works">${st.works.map((w) => renderWork(w, prefix)).join('')}</div>` : ''}
        </div>
      </section>`

const allWorks = data.stages.flatMap((st) =>
  (st.works || []).map((w) => ({ ...w, period: st.period, stageTitle: st.title }))
)
const worksCount = allWorks.length

// ---------- 主页的四样东西 ----------

const OBJECT_ART = {
  about: `<svg viewBox="0 0 120 120" aria-hidden="true">
    <path d="M18 20h84v76l-14 14H18z" fill="var(--surface)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M88 96v14l14-14z" fill="var(--paper)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M32 42h54M32 56h54M32 70h34" stroke="currentColor" stroke-width="1.1" opacity=".45" stroke-linecap="round"/>
  </svg>`,
  works: `<svg viewBox="0 0 120 150" aria-hidden="true">
    <rect x="20" y="10" width="80" height="130" rx="6" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/>
    <path d="M40 10v130" stroke="currentColor" stroke-width="1.2" opacity=".45"/>
    <path d="M52 36h36M52 52h36M52 68h24" stroke="currentColor" stroke-width="1.1" opacity=".4" stroke-linecap="round"/>
    <path d="M78 10v34" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
  </svg>`,
  likes: `<svg viewBox="0 0 140 96" aria-hidden="true">
    <rect x="8" y="12" width="124" height="72" rx="8" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/>
    <rect x="22" y="30" width="92" height="30" rx="4" fill="var(--paper)" stroke="currentColor" stroke-width="1.2"/>
    <circle cx="46" cy="45" r="8" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <circle cx="90" cy="45" r="8" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <path d="M22 74h96" stroke="currentColor" stroke-width="1.1" opacity=".35"/>
  </svg>`,
  photos: `<svg viewBox="0 0 140 120" aria-hidden="true">
    <rect x="16" y="26" width="86" height="66" rx="3" fill="var(--surface)" stroke="currentColor" stroke-width="1.4" transform="rotate(-6 59 59)"/>
    <rect x="30" y="18" width="90" height="70" rx="3" fill="var(--surface)" stroke="currentColor" stroke-width="1.4" transform="rotate(4 75 53)"/>
    <rect x="36" y="30" width="80" height="60" rx="3" fill="var(--paper)" stroke="currentColor" stroke-width="1.6"/>
    <circle cx="58" cy="50" r="6" fill="var(--accent)" opacity=".55"/>
    <path d="M40 80l18-20 14 14 12-10 18 16z" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".6"/>
  </svg>`
}

const renderObject = (o) => {
  const art = o.image ? `<img src="${esc(o.image)}" alt="" />` : OBJECT_ART[o.key] || OBJECT_ART.about
  const style = `--x:${Number(o.x) || 50}%;--y:${Number(o.y) || 50}%;--r:${Number(o.rotate) || 0}deg;--s:${Number(o.scale) || 1}`
  const inner = `<span class="object-art">${art}</span><span class="object-label">${esc(o.label)}</span>`
  return o.soon
    ? `<span class="object is-soon" style="${style}">${inner}<span class="object-note">还在收集中</span></span>`
    : `<a class="object" href="${esc(o.href || '#')}" style="${style}">${inner}</a>`
}

// ---------- 页面 ----------

const bg = home.background
  ? `<div class="home-bg${home.backgroundMotion ? ' is-slow' : ''}" style="background-image:url('${esc(
      asset(home.background)
    )}');--scrim:${Number.isFinite(Number(home.scrim)) ? Number(home.scrim) : 0.55}"></div>`
  : ''

const pageHome = `${head({ title: s.title, desc: s.tagline, prefix: '' })}
<body class="page-home">
${skipLink}
  <main id="main" class="home">
    ${bg}
    <div class="home-intro">
      <p class="eyebrow">人生轨迹 · ${esc(s.location)}</p>
      <h1 class="name">${esc(s.name)}</h1>
      <p class="tagline">${esc(s.tagline)}</p>
    </div>
    <div class="objects" aria-label="入口">
      ${(home.objects || []).map(renderObject).join('\n      ')}
    </div>
    <p class="home-hint">点开一样东西</p>
  </main>
</body>
</html>
`

const pageAbout = `${head({ title: `关于 · ${s.name}`, desc: s.tagline, prefix: '../' })}
<body class="page-about">
${skipLink}
${navBar('../', 'about')}
  <header class="hero">
    <div class="hero-inner">
      <p class="eyebrow">关于 · ${esc(s.location)}</p>
      <h1 class="name">${esc(s.name)}</h1>
      <p class="tagline">${esc(s.tagline)}</p>
      <p class="intro">${esc(s.intro)}</p>
      ${s.github ? `<p class="hero-count"><a href="${esc(safeUrl(s.github))}" target="_blank" rel="noopener noreferrer">GitHub</a></p>` : ''}
    </div>
  </header>

  <main id="main" class="timeline" tabindex="-1">
${data.stages.map((st, i) => renderStage(st, i, '../')).join('\n')}
  </main>

${footer('../')}
</body>
</html>
`

const pageWorks = `${head({ title: `作品 · ${s.name}`, desc: `${allWorks.length} 件作品`, prefix: '../' })}
<body class="page-works">
${skipLink}
${navBar('../', 'works')}
  <main id="main" class="inner-page">
    <header class="inner-head">
      <p class="eyebrow">作品</p>
      <h1 class="inner-title">做过的 ${allWorks.length} 件东西</h1>
      <p class="intro">按时间排，最近的在上。</p>
    </header>
    ${
      allWorks.length
        ? `<div class="works">${allWorks
            .slice()
            .reverse()
            .map((w) => renderWork(w, '../'))
            .join('')}</div>`
        : '<p class="empty-state">还没有作品。</p>'
    }
  </main>
${footer('../')}
</body>
</html>
`

const renderLikes = (items = []) =>
  items.length
    ? `<ul class="like-list">${items
        .map(
          (it) => `<li class="like"><span class="like-title">${esc(it.title)}</span>${
            it.note ? `<span class="like-note">${esc(it.note)}</span>` : ''
          }${it.link ? ` <a href="${esc(safeUrl(it.link))}" target="_blank" rel="noopener noreferrer">去看看</a>` : ''}</li>`
        )
        .join('')}</ul>`
    : '<p class="empty-state">还在收集中。</p>'

const pageLikes = `${head({ title: `喜爱 · ${s.name}`, desc: '喜欢的东西', prefix: '../' })}
<body class="page-likes">
${skipLink}
${navBar('../', 'likes')}
  <main id="main" class="inner-page">
    <header class="inner-head">
      <p class="eyebrow">喜爱</p>
      <h1 class="inner-title">愿意反复看的东西</h1>
      <p class="intro">${esc((data.likes || {}).intro || '书、片子、工具，随手记。')}</p>
    </header>
    ${renderLikes((data.likes || {}).items || [])}
  </main>
${footer('../')}
</body>
</html>
`

const renderPhotos = (items = []) =>
  items.length
    ? `<div class="photo-grid">${items
        .map(
          (p) => `<figure class="photo"><img src="${esc(asset(p.image, '../'))}" alt="${esc(p.caption || '')}" loading="lazy" />${
            p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''
          }</figure>`
        )
        .join('')}</div>`
    : '<p class="empty-state">还没有放照片。</p>'

const pagePhotos = `${head({ title: `图片 · ${s.name}`, desc: '照片与截图', prefix: '../' })}
<body class="page-photos">
${skipLink}
${navBar('../', 'photos')}
  <main id="main" class="inner-page">
    <header class="inner-head">
      <p class="eyebrow">图片</p>
      <h1 class="inner-title">一些画面</h1>
      <p class="intro">${esc((data.photos || {}).intro || '以后放这里。')}</p>
    </header>
    ${renderPhotos((data.photos || {}).items || [])}
  </main>
${footer('../')}
</body>
</html>
`

// ---------- 写盘 ----------

const pages = {
  'index.html': pageHome,
  'about/index.html': pageAbout,
  'works/index.html': pageWorks,
  'likes/index.html': pageLikes,
  'photos/index.html': pagePhotos
}

for (const [file, html] of Object.entries(pages)) {
  const target = join(here, file)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, html)
}

console.log(`已生成 ${Object.keys(pages).length} 页：主页 / 关于 / 作品 / 喜爱 / 图片 · ${worksCount} 件作品`)

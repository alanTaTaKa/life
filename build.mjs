import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(join(here, 'content.json'), 'utf8'))
const s = data.site

const esc = (v = '') =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const safeUrl = (v = '') => (/^https?:\/\//i.test(v) ? v : '#')

const initials = (title) => String(title).replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '').slice(0, 2) || '作品'

const renderWork = (w) => {
  const thumb = w.image
    ? `<img src="${esc(w.image)}" alt="${esc(w.title)} 的封面" loading="lazy" />`
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

const renderStage = (st, idx) => `
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
              ? `<ul class="achievements">${st.achievements
                  .map((a) => `<li>${esc(a)}</li>`)
                  .join('')}</ul>`
              : ''
          }
          ${
            (st.works || []).length
              ? `<div class="works">${st.works.map(renderWork).join('')}</div>`
              : ''
          }
        </div>
      </section>`

const worksCount = data.stages.reduce((n, st) => n + (st.works || []).length, 0)

// 联系方式都可能缺：邮箱不填就不渲染 mailto，GitHub 同理
const contacts = [
  s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : '',
  s.github ? `<a href="${esc(safeUrl(s.github))}" target="_blank" rel="noopener noreferrer">GitHub</a>` : ''
].filter(Boolean)

const footerContacts = [
  s.email ? `<a href="mailto:${esc(s.email)}">写信给我</a>` : '',
  s.github ? `<a href="${esc(safeUrl(s.github))}" target="_blank" rel="noopener noreferrer">GitHub</a>` : ''
].filter(Boolean)

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(s.title)}</title>
<meta name="description" content="${esc(s.tagline)}" />
<meta property="og:title" content="${esc(s.title)}" />
<meta property="og:description" content="${esc(s.tagline)}" />
<meta property="og:type" content="profile" />
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#3B4247"/><circle cx="32" cy="32" r="9" fill="#8FBFA6"/></svg>`
)}" />
<link rel="stylesheet" href="styles.css" />
</head>
<body>
  <a class="skip-link" href="#timeline">跳到时间线</a>

  <header class="hero">
    <div class="hero-inner">
      <p class="eyebrow">人生轨迹 · ${esc(s.location)}</p>
      <h1 class="name">${esc(s.name)}</h1>
      <p class="tagline">${esc(s.tagline)}</p>
      <p class="intro">${esc(s.intro)}</p>
      ${contacts.length ? `<nav class="hero-links" aria-label="联系方式">
        ${contacts.join('\n        ')}
      </nav>` : ''}
      <p class="hero-count">${data.stages.length} 个阶段 · ${worksCount} 件作品</p>
    </div>
    <a class="scroll-cue" href="#timeline" aria-hidden="true" tabindex="-1"><span></span></a>
  </header>

  <main id="timeline" class="timeline" tabindex="-1">
${data.stages.map(renderStage).join('\n')}
  </main>

  <footer class="footer">
    <p class="footer-note">${esc(s.footerNote)}</p>
    ${footerContacts.length ? `<p class="footer-links">
      ${footerContacts.join('\n      ')}
    </p>` : ''}
    <p class="copyright">© ${new Date().getFullYear()} ${esc(s.name)}</p>
  </footer>
</body>
</html>
`

writeFileSync(join(here, 'index.html'), html)
console.log(`已生成 index.html：${data.stages.length} 个阶段 / ${worksCount} 件作品`)

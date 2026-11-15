#!/usr/bin/env node
// 内容体检：改完 content.json 跑一遍，把「会让页面悄悄变差」的问题拦在现场。
//
//   node check.mjs            报告问题；有错误时退出码 1
//   node check.mjs --strict   把「示例 / 占位」也算错误（发布前用）
//
// 它只读文件，不改任何东西。

import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const strict = process.argv.includes('--strict')

const errors = []
const warnings = []
const err = (m) => errors.push(m)
const warn = (m) => warnings.push(m)

const read = (f) => readFileSync(join(here, f), 'utf8')
const isUrl = (v) => /^https?:\/\//i.test(v)

// ---------- content.json ----------

let data
try {
  data = JSON.parse(read('content.json'))
} catch (e) {
  console.error(`✗ content.json 不是合法 JSON：${e.message}`)
  process.exit(1)
}

const s = data.site || {}
for (const key of ['title', 'name', 'tagline', 'intro', 'location', 'footerNote']) {
  if (!s[key] || String(s[key]).trim() === '') err(`site.${key} 为空`)
}
// 邮箱和 GitHub 都可以不给：不给就不渲染，不是错误
if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) err(`site.email 不像邮箱：${s.email}`)
if (s.github && !isUrl(s.github)) err(`site.github 不是 http(s) 链接：${s.github}`)
if (s.name && /你的名字/.test(s.name)) warn('site.name 还是「你的名字」')

// 主页：四样入口 + 背景
const homeObjs = (data.home || {}).objects || []
if (!homeObjs.length) warn('主页还没有摆放入口')
homeObjs.forEach((o, i) => {
  const at = `home.objects[${i}]`
  if (!o.label) err(`${at}.label 为空`)
  if (!o.href) err(`${at}.href 为空`)
  else if (!isUrl(o.href) && !/^[a-z0-9-]+\/$/i.test(o.href)) err(`${at}.href 既不是 http 链接也不是 "xxx/"：${o.href}`)
  for (const axis of ['x', 'y']) {
    const v = Number(o[axis])
    if (!Number.isFinite(v) || v < 0 || v > 100) err(`${at}.${axis} 要在 0–100 之间`)
  }
})

const homeBg = (data.home || {}).background
if (homeBg) {
  const p = join(here, homeBg)
  if (!existsSync(p)) err(`home.background 指向不存在的文件：${homeBg}`)
  else if (statSync(p).size > 300 * 1024) warn(`home.background 有 ${Math.round(statSync(p).size / 1024)}KB，超过 300KB`)
}

// 图片页的照片
;((data.photos || {}).items || []).forEach((item, i) => {
  if (!item.image) return err(`photos.items[${i}].image 为空`)
  const p = join(here, item.image)
  if (!existsSync(p)) err(`photos.items[${i}] 图片不存在：${item.image}`)
  else if (statSync(p).size > 300 * 1024) warn(`photos.items[${i}] 有 ${Math.round(statSync(p).size / 1024)}KB，超过 300KB`)
})

if (!Array.isArray(data.stages) || data.stages.length === 0) {
  err('stages 不是非空数组')
} else {
  const ids = new Set()
  data.stages.forEach((st, i) => {
    const at = `stages[${i}]`
    if (!st.period) err(`${at}.period 为空（左侧年份会缺一块）`)
    else if (!/\d{4}/.test(st.period)) warn(`${at}.period 里没有四位年份：${st.period}`)
    if (!st.title) err(`${at}.title 为空`)
    if (!st.summary) err(`${at}.summary 为空`)
    if (!st.place) warn(`${at}.place 为空（年份下面那行会空着）`)
    if (st.id) {
      if (ids.has(st.id)) err(`${at}.id 重复：${st.id}`)
      ids.add(st.id)
    }
    if (st.achievements !== undefined && !Array.isArray(st.achievements)) err(`${at}.achievements 不是数组`)
    if (st.works !== undefined && !Array.isArray(st.works)) err(`${at}.works 不是数组`)

    ;(st.works || []).forEach((w, j) => {
      const wat = `${at}.works[${j}]`
      for (const key of ['title', 'role', 'summary']) {
        if (!w[key]) err(`${wat}.${key} 为空`)
      }
      if (w.link === undefined) warn(`${wat}.link 缺省，卡片会不可点；不想让点就写 "#"`)
      else if (w.link !== '#' && !isUrl(w.link)) err(`${wat}.link 既不是 http(s) 也不是 "#"：${w.link}`)
      if (w.image) {
        const p = join(here, w.image)
        if (!existsSync(p)) err(`${wat}.image 指向不存在的文件：${w.image}`)
        else if (statSync(p).size > 300 * 1024) warn(`${wat}.image 超过 300KB（${Math.round(statSync(p).size / 1024)}KB）`)
      }
    })
  })
}

// ---------- 生成的页面 ----------

const PAGES = ['index.html', 'about/index.html', 'works/index.html', 'likes/index.html', 'photos/index.html']
const contentMtime = statSync(join(here, 'content.json')).mtimeMs
let html = ''
const collected = []

for (const page of PAGES) {
  let text = ''
  try {
    text = read(page)
    collected.push(text)
    if (statSync(join(here, page)).mtimeMs < contentMtime) {
      err(`${page} 比 content.json 旧 —— 改了内容没重新生成，跑 node build.mjs`)
    }
  } catch {
    err(`${page} 不存在，先跑 node build.mjs`)
  }
}

html = collected.join('\n')

if (html) {
  // TODO 只认大写：小写的 todo 多半是文件名（比如 assets/todo-cover.png）
  const placeholders = html.match(/示例|占位|lorem ipsum|TODO/g) || []
  if (placeholders.length) {
    const line = strict ? err : warn
    line(`页面里还有 ${placeholders.length} 处示例/占位文案（发布前必须清空）`)
  }

  for (const m of html.matchAll(/<a\b[^>]*href="(https?:[^"]*)"[^>]*>/gi)) {
    const tag = m[0]
    if (!/rel="[^"]*noopener/.test(tag) || !/rel="[^"]*noreferrer/.test(tag)) {
      err(`外链缺 rel="noopener noreferrer"：${m[1].slice(0, 60)}`)
    }
  }

  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0])
  imgs.filter((t) => !/\balt=/.test(t)).forEach(() => err('有 <img> 缺 alt'))

  if (!/<html lang="zh-CN"/.test(html)) warn('html 缺 lang="zh-CN"')
  if (!/name="viewport"/.test(html)) err('缺 viewport meta，手机上会缩成一小块')

  // 主页面上的入口链接要指向真的存在的页面
  const home = collected[0] || ''
  for (const m of home.matchAll(/<a class="object" href="([^"]+)"/g)) {
    const href = m[1]
    if (href.startsWith('http')) continue
    const target = join(here, href, 'index.html')
    if (!existsSync(target)) err(`主页入口指向不存在的页面：${href}`)
  }
}

// ---------- styles.css ----------

let css = ''
try {
  css = read('styles.css')
} catch {
  warn('styles.css 不存在')
}

if (css) {
  // 铁律 3：十六进制只许出现在 :root 块里
  const stripped = css.replace(/:root\s*\{[^}]*\}/g, '')
  stripped.split('\n').forEach((line, i) => {
    if (/#[0-9a-fA-F]{3,8}\b/.test(line)) {
      err(`styles.css:${i + 1} 在 :root 之外写了颜色，改用 var(--xxx)：${line.trim()}`)
    }
  })

  // CSS 里引用的本地图片必须真的在
  for (const m of css.matchAll(/url\(["']?(?!data:)([^"')]+)["']?\)/g)) {
    const p = join(here, m[1])
    if (!existsSync(p)) err(`styles.css 引用了不存在的文件：${m[1]}`)
    else if (statSync(p).size > 150 * 1024) warn(`${m[1]} 有 ${Math.round(statSync(p).size / 1024)}KB，装饰图别超过 150KB`)
  }

  // 对比度：验收清单里「正文 ≥ 4.5:1」这一条，别靠眼睛
  const lin = (hex) => {
    const n = parseInt(hex.slice(1), 16)
    return [16, 8, 0]
      .map((s) => ((n >> s) & 255) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      .reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0)
  }
  const ratio = (a, b) => {
    const [hi, lo] = [lin(a), lin(b)].sort((p, q) => q - p)
    return (hi + 0.05) / (lo + 0.05)
  }

  const blocks = [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map((m) => {
    const vars = {}
    for (const v of m[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})/g)) vars[v[1]] = v[2]
    return vars
  })
  const themes = [['浅色', blocks[0] || {}]]
  if (blocks[1]) themes.push(['暗色', blocks[1]])

  for (const [name, vars] of themes) {
    const pairs = [
      ['ink', 'paper', '正文'],
      ['muted', 'paper', '次级文字'],
      ['accent', 'paper', '强调色当正文'],
      ['ink', 'surface', '卡片正文']
    ]
    for (const [fg, bg, label] of pairs) {
      if (!vars[fg] || !vars[bg]) continue
      const r = ratio(vars[fg], vars[bg])
      if (r < 4.5) err(`${name}·${label} ${vars[fg]} on ${vars[bg]} 只有 ${r.toFixed(2)}:1（要 ≥ 4.5）`)
    }
  }
}

// ---------- 报告 ----------

const total = data.stages?.length ?? 0
const works = (data.stages || []).reduce((n, st) => n + (st.works || []).length, 0)
console.log(`\n内容体检 · ${total} 个阶段 / ${works} 件作品${strict ? '（严格模式）' : ''}\n`)

for (const e of errors) console.log(`  ✗ ${e}`)
for (const w of warnings) console.log(`  ! ${w}`)
if (!errors.length && !warnings.length) console.log('  ✓ 没发现问题')

console.log(`\n${errors.length ? '✗' : '✓'} 错误 ${errors.length} · 提醒 ${warnings.length}\n`)
process.exit(errors.length ? 1 : 0)

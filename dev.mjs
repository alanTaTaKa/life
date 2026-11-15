#!/usr/bin/env node
// 开发服务器（只给开发用，站点本身仍然是零依赖静态文件）。
//
//   node dev.mjs          起在 127.0.0.1:4173
//   node dev.mjs 5000     指定端口
//
// 它会做三件事：
//   1. 把 site/ 当静态目录发出去（no-store，不会拿到旧缓存）
//   2. 盯着 content.json / styles.css / build.mjs，一改就重跑 build.mjs
//   3. 构建成功后，通过 /__reload（SSE）通知打开的页面自己刷新
//
// 注入的刷新脚本只存在于发送时的内存里，不写进 index.html。

import { createServer } from 'node:http'
import { createReadStream, statSync, watch, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here)
const firstPort = Number(process.argv[2] || process.env.PORT || 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
}

const stamp = () => new Date().toTimeString().slice(0, 8)

const RELOAD_SNIPPET = `
<script>
  new EventSource('/__reload').onmessage = () => location.reload()
</script>`

/** 打开着的页面，SSE 连接都挂在这里 */
const clients = new Set()

function build() {
  const t0 = Date.now()
  const r = spawnSync(process.execPath, [join(here, 'build.mjs')], { cwd: here, encoding: 'utf8' })
  const ms = Date.now() - t0
  if (r.status !== 0) {
    console.error(`[${stamp()}] ✗ 构建失败（${ms} ms）`)
    console.error(String(r.stderr || r.stdout).trim())
    return false
  }
  console.log(`[${stamp()}] ✓ ${String(r.stdout).trim()}（${ms} ms）`)
  return true
}

function broadcast() {
  for (const res of clients) res.write('data: reload\n\n')
}

function serveReload(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive'
  })
  res.write(': connected\n\n')
  clients.add(res)
  req.on('close', () => clients.delete(res))
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('404')
}

function serveFile(path, req, res, injectReload = true) {
  let st
  try {
    st = statSync(path)
  } catch {
    return notFound(res)
  }
  // 目录：返回里面的 index.html
  if (st.isDirectory()) {
    path = join(path, 'index.html')
    try {
      st = statSync(path)
    } catch {
      return notFound(res)
    }
  }
  if (!st.isFile()) return notFound(res)

  const type = MIME[extname(path).toLowerCase()] || 'application/octet-stream'

  // HTML 在发送时注入刷新脚本；磁盘上的 index.html 一个字节都不改
  // /.dev/ 下的页面（编辑器）不注入：保存一次就重载会把没存完的改动冲掉
  if (type.startsWith('text/html') && injectReload) {
    const html = readFileSync(path, 'utf8').replace('</body>', `${RELOAD_SNIPPET}\n</body>`)
    const body = Buffer.from(html, 'utf8')
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', 'Content-Length': body.length })
    return res.end(body)
  }

  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', 'Content-Length': st.size })
  createReadStream(path).pipe(res)
}

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0])
  if (url === '/__reload') return serveReload(req, res)

  const target = resolve(root, '.' + (url === '/' ? '/index.html' : url))
  // 别让 ../ 跑出 site/
  if (target !== root && !target.startsWith(root + sep)) return notFound(res)
  serveFile(target, req, res, !url.startsWith('/.dev/'))
})

/** 构建结果变了才广播，且合并 Windows 上重复触发的两次事件 */
let timer = null
let lastOk = true
function scheduleBuild() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    const ok = build()
    if (ok !== lastOk) lastOk = ok
    if (ok) broadcast()
  }, 120)
}

function listen(port, triesLeft = 9) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && triesLeft > 0) {
      const next = port + 1
      console.log(`[${stamp()}] ${port} 被占用，改试 ${next}`)
      return listen(next, triesLeft - 1)
    }
    if (err.code === 'EADDRINUSE') {
      console.error(`[${stamp()}] ✗ 端口都被占用了，先关掉旧的预览服务再跑：node dev.mjs 4300`)
    } else {
      console.error(`[${stamp()}] ✗ 起不来：${err.message}`)
    }
    process.exit(1)
  })
  server.listen(port, '127.0.0.1', () => {
    console.log(`\n  人生时间线 · 开发预览`)
    console.log(`  站    http://127.0.0.1:${port}/`)
    console.log(`  编辑器 http://127.0.0.1:${port}/.dev/editor/\n`)
    console.log(`  改 content.json / styles.css 保存即可，页面会自动刷新。`)
    console.log(`  按 Ctrl+C 停。\n`)
  })
}

build()
// fs.watch 一次只能看一个路径，看目录再按文件名过滤
watch(here, (event, file) => {
  if (file && /^(content\.json|styles\.css|build\.mjs)$/.test(file)) scheduleBuild()
})
listen(firstPort)

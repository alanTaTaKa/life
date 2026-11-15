// 主页交互：右键菜单（效果 + 字号 + 编辑位置），选择记在 localStorage。
// 默认值来自 .home 上的 data-defaults（build.mjs 从 content.json 写入）。
// 编辑位置时：本地服务在跑就把坐标写回 content.json，否则只存这台浏览器。

;(() => {
  const home = document.querySelector('.home')
  if (!home) return

  const KEY_EFFECTS = 'life.effects.v1'
  const KEY_POS = 'life.home.objects'
  const bg = document.querySelector('.home-bg')

  const defaults = (() => {
    try {
      return Object.assign(
        { spotlight: true, motion: false, scrim: 0.55, size: 170, text: 1 },
        JSON.parse(home.dataset.defaults || '{}')
      )
    } catch {
      return { spotlight: true, motion: false, scrim: 0.55, size: 170, text: 1 }
    }
  })()

  const state = { ...defaults }
  try {
    Object.assign(state, JSON.parse(localStorage.getItem(KEY_EFFECTS) || '{}'))
  } catch {}

  const objects = [...home.querySelectorAll('.object')]
  const texts = [['小', 0.9], ['中', 1], ['大', 1.15]]
  const scrims = [[0, '无'], [0.3, '轻'], [0.55, '中'], [0.75, '重']]

  // ---------- 应用 ----------

  function apply() {
    home.dataset.spotlight = state.spotlight ? 'on' : 'off'
    home.style.setProperty('--spot-r', state.size + 'px')
    document.documentElement.style.setProperty('--ts', state.text)
    if (bg) {
      bg.classList.toggle('is-slow', !!state.motion)
      bg.style.setProperty('--scrim', state.scrim)
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY_EFFECTS, JSON.stringify(state))
    } catch {}
  }

  // 指针跟随：聚光圆心
  let raf = 0
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!state.spotlight || raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        document.documentElement.style.setProperty('--spot-x', e.clientX + 'px')
        document.documentElement.style.setProperty('--spot-y', e.clientY + 'px')
      })
    },
    { passive: true }
  )

  // ---------- 本机记住的位置 ----------

  function applyStoredPositions() {
    let list = null
    try {
      list = JSON.parse(localStorage.getItem(KEY_POS) || 'null')
    } catch {}
    if (!Array.isArray(list)) return
    list.forEach((p) => {
      const el = objects.find((o) => o.dataset.key === p.key)
      if (!el) return
      el.style.left = p.x + '%'
      el.style.top = p.y + '%'
    })
  }

  // ---------- 菜单 ----------

  let menu = null
  let onDocClick = null

  function closeMenu() {
    if (!menu) return
    menu.remove()
    menu = null
    if (onDocClick) document.removeEventListener('click', onDocClick, true)
    document.removeEventListener('keydown', onKey, true)
  }

  function onKey(e) {
    if (e.key === 'Escape') closeMenu()
  }

  function openMenu(x, y) {
    closeMenu()

    const el = document.createElement('div')
    el.className = 'fx-menu'
    el.setAttribute('role', 'dialog')
    el.setAttribute('aria-label', '主页效果')
    el.innerHTML = `
      <div class="fx-head">
        <span class="fx-title">主页效果</span>
        <button type="button" class="fx-close" aria-label="关闭">×</button>
      </div>
      <p class="fx-sub">字号</p>
      <div class="fx-row">
        ${texts.map(([label, v]) => `<button type="button" data-text="${v}" class="${Math.abs(state.text - v) < 0.01 ? 'on' : ''}">${label}</button>`).join('')}
      </div>
      <div class="fx-sep"></div>
      <button type="button" data-fx="spotlight" aria-pressed="${state.spotlight}">
        <span>鼠标聚光</span><span class="fx-mark">${state.spotlight ? '✓' : ''}</span>
      </button>
      <button type="button" data-fx="motion" aria-pressed="${state.motion}">
        <span>背景缩放</span><span class="fx-mark">${state.motion ? '✓' : ''}</span>
      </button>
      <p class="fx-sub">压暗</p>
      <div class="fx-row">
        ${scrims.map(([v, label]) => `<button type="button" data-scrim="${v}" class="${Math.abs(state.scrim - v) < 0.01 ? 'on' : ''}">${label}</button>`).join('')}
      </div>
      <div class="fx-sep"></div>
      <button type="button" data-fx="edit"><span>编辑位置…</span><span class="fx-mark">↔</span></button>
      <button type="button" data-fx="reset"><span>恢复默认</span></button>
    `

    document.body.appendChild(el)
    const rect = el.getBoundingClientRect()
    el.style.left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)) + 'px'
    el.style.top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)) + 'px'
    menu = el

    // 菜单钉住：点选项不关，只更新状态；点「×」或外面才关
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('button')
      if (!btn) return
      e.stopPropagation()

      if (btn.classList.contains('fx-close')) return closeMenu()

      if (btn.dataset.fx === 'spotlight' || btn.dataset.fx === 'motion') {
        state[btn.dataset.fx] = !state[btn.dataset.fx]
      } else if (btn.dataset.scrim !== undefined) {
        state.scrim = Number(btn.dataset.scrim)
      } else if (btn.dataset.text !== undefined) {
        state.text = Number(btn.dataset.text)
      } else if (btn.dataset.fx === 'reset') {
        Object.assign(state, defaults)
      } else if (btn.dataset.fx === 'edit') {
        closeMenu()
        enterEdit()
        return
      }

      apply()
      save()
      refreshMenu(el)
    })

    onDocClick = (e) => {
      if (!menu || menu.contains(e.target)) return
      closeMenu()
    }
    setTimeout(() => {
      document.addEventListener('click', onDocClick, true)
      document.addEventListener('keydown', onKey, true)
    }, 0)
  }

  // 菜单开着时，把选中态刷新一下（不重建 DOM，避免闪烁）
  function refreshMenu(el) {
    el.querySelectorAll('[data-fx="spotlight"],[data-fx="motion"]').forEach((b) => {
      const on = state[b.dataset.fx]
      b.setAttribute('aria-pressed', String(on))
      const mark = b.querySelector('.fx-mark')
      if (mark) mark.textContent = on ? '✓' : ''
    })
    el.querySelectorAll('[data-scrim]').forEach((b) => {
      b.classList.toggle('on', Math.abs(state.scrim - Number(b.dataset.scrim)) < 0.01)
    })
    el.querySelectorAll('[data-text]').forEach((b) => {
      b.classList.toggle('on', Math.abs(state.text - Number(b.dataset.text)) < 0.01)
    })
  }

  // ---------- 编辑位置 ----------

  let editing = false
  let bar = null
  let drag = null
  const before = new Map()

  function enterEdit() {
    if (editing) return
    editing = true
    home.classList.add('is-editing')
    objects.forEach((el, i) => {
      before.set(i, { x: el.style.left, y: el.style.top })
      el.setAttribute('tabindex', '0')
    })
    bar = document.createElement('div')
    bar.className = 'fx-bar'
    bar.innerHTML = `
      <span class="fx-bar-tip">拖动入口，摆好了点保存</span>
      <button type="button" data-edit="save">保存位置</button>
      <button type="button" data-edit="undo">撤销</button>
      <button type="button" data-edit="exit">退出</button>`
    document.body.appendChild(bar)
    bar.addEventListener('click', onBarClick)
  }

  function exitEdit() {
    editing = false
    home.classList.remove('is-editing')
    if (bar) {
      bar.remove()
      bar = null
    }
    objects.forEach((el) => el.removeAttribute('tabindex'))
  }

  function undoEdit() {
    objects.forEach((el, i) => {
      const b = before.get(i)
      if (!b) return
      el.style.left = b.x
      el.style.top = b.y
    })
  }

  async function saveEdit() {
    const list = objects.map((el) => ({
      key: el.dataset.key,
      x: Math.round(Number.parseFloat(el.style.left) || 0),
      y: Math.round(Number.parseFloat(el.style.top) || 0)
    }))
    try {
      const res = await fetch('/__save-home', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objects: list })
      })
      if (res.ok) {
        try {
          localStorage.removeItem(KEY_POS)
        } catch {}
        exitEdit()
        toast('已写进 content.json，稍后刷新就能看到')
        return
      }
    } catch {
      // 线上没有这个接口，落到本机
    }
    try {
      localStorage.setItem(KEY_POS, JSON.stringify(list))
    } catch {}
    exitEdit()
    toast('只存在这台浏览器；要发布给别人看，得在编辑器里保存或推送')
  }

  function onBarClick(e) {
    const btn = e.target.closest('button[data-edit]')
    if (!btn) return
    if (btn.dataset.edit === 'save') saveEdit()
    else if (btn.dataset.edit === 'undo') undoEdit()
    else exitEdit()
  }

  // 拖动（编辑模式才生效；点在链接上照样能拖，因为编辑时先 preventDefault）
  home.addEventListener('pointerdown', (e) => {
    if (!editing) return
    const el = e.target.closest('.object')
    if (!el) return
    e.preventDefault()
    const rect = home.getBoundingClientRect()
    drag = { el, rect, startX: e.clientX, startY: e.clientY, ox: Number.parseFloat(el.style.left) || 50, oy: Number.parseFloat(el.style.top) || 50 }
    el.classList.add('dragging')
    el.setPointerCapture?.(e.pointerId)
  })

  document.addEventListener('pointermove', (e) => {
    if (!drag) return
    const dx = ((e.clientX - drag.startX) / drag.rect.width) * 100
    const dy = ((e.clientY - drag.startY) / drag.rect.height) * 100
    const x = Math.max(0, Math.min(100, Math.round(drag.ox + dx)))
    const y = Math.max(0, Math.min(100, Math.round(drag.oy + dy)))
    drag.el.style.left = x + '%'
    drag.el.style.top = y + '%'
  })

  document.addEventListener('pointerup', () => {
    if (!drag) return
    drag.el.classList.remove('dragging')
    drag = null
  })

  // 编辑时点链接不要跳走
  home.addEventListener(
    'click',
    (e) => {
      if (editing && e.target.closest('a')) e.preventDefault()
    },
    true
  )

  // ---------- 提示 ----------

  function toast(msg, ms = 2600) {
    let t = document.querySelector('.fx-toast')
    if (!t) {
      t = document.createElement('div')
      t.className = 'fx-toast'
      document.body.appendChild(t)
    }
    t.textContent = msg
    t.classList.add('on')
    clearTimeout(t._timer)
    t._timer = setTimeout(() => t.classList.remove('on'), ms)
  }

  // ---------- 启动 ----------

  home.addEventListener('contextmenu', (e) => {
    if (e.target.closest('a') && !editing) return
    e.preventDefault()
    openMenu(e.clientX, e.clientY)
  })

  apply()
  applyStoredPositions()

  if (location.search.includes('menu=1')) openMenu(window.innerWidth / 2 - 110, 200)
  if (location.search.includes('edit=1')) enterEdit()
})()

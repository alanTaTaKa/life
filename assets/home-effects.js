// 主页效果菜单：右键切换聚光 / 缩放 / 压暗，选择记在 localStorage，不影响别人。
// 默认值来自 .home 上的 data-defaults（由 build.mjs 从 content.json 写入）。
// 没有 JS 时：页面照常用，只是没有这个菜单。

;(() => {
  const home = document.querySelector('.home')
  if (!home) return

  const KEY = 'life.effects.v1'
  const bg = document.querySelector('.home-bg')
  const spotLayer = bg || home

  const defaults = (() => {
    try {
      return Object.assign(
        { spotlight: true, motion: false, scrim: 0.55, size: 170 },
        JSON.parse(home.dataset.defaults || '{}')
      )
    } catch {
      return { spotlight: true, motion: false, scrim: 0.55, size: 170 }
    }
  })()

  const state = { ...defaults }
  try {
    Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}'))
  } catch {}

  const scrims = [
    [0, '无'],
    [0.3, '轻'],
    [0.55, '中'],
    [0.75, '重']
  ]

  function apply() {
    home.dataset.spotlight = state.spotlight ? 'on' : 'off'
    home.style.setProperty('--spot-r', state.size + 'px')
    if (bg) {
      bg.classList.toggle('is-slow', !!state.motion)
      bg.style.setProperty('--scrim', state.scrim)
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {}
  }

  // 指针跟随：更新聚光圆心（只在开着的时候干活）
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

  // ---------- 菜单 ----------

  let menu = null
  let onDocClick = null

  function close() {
    if (!menu) return
    menu.remove()
    menu = null
    document.removeEventListener('click', onDocClick, true)
    document.removeEventListener('keydown', onKey, true)
    window.removeEventListener('scroll', close, true)
  }

  function onKey(e) {
    if (e.key === 'Escape') close()
  }

  function open(x, y) {
    close()

    const el = document.createElement('div')
    el.className = 'fx-menu'
    el.setAttribute('role', 'menu')
    el.innerHTML = `
      <p class="fx-title">主页效果</p>
      <button type="button" role="menuitemcheckbox" aria-checked="${state.spotlight}" data-fx="spotlight">
        <span>鼠标聚光</span><span class="fx-mark">${state.spotlight ? '✓' : ''}</span>
      </button>
      <button type="button" role="menuitemcheckbox" aria-checked="${state.motion}" data-fx="motion">
        <span>背景缩放</span><span class="fx-mark">${state.motion ? '✓' : ''}</span>
      </button>
      <div class="fx-sep"></div>
      <p class="fx-sub">压暗</p>
      <div class="fx-row">
        ${scrims
          .map(
            ([v, label]) =>
              `<button type="button" data-scrim="${v}" class="${Math.abs(state.scrim - v) < 0.01 ? 'on' : ''}">${label}</button>`
          )
          .join('')}
      </div>
      <div class="fx-sep"></div>
      <button type="button" data-fx="off"><span>全部关闭</span></button>
      <button type="button" data-fx="reset"><span>恢复默认</span></button>
    `

    document.body.appendChild(el)
    const rect = el.getBoundingClientRect()
    el.style.left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)) + 'px'
    el.style.top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)) + 'px'
    menu = el

    el.addEventListener('click', (e) => {
      const btn = e.target.closest('button')
      if (!btn) return
      if (btn.dataset.fx === 'spotlight' || btn.dataset.fx === 'motion') {
        state[btn.dataset.fx] = !state[btn.dataset.fx]
      } else if (btn.dataset.scrim !== undefined) {
        state.scrim = Number(btn.dataset.scrim)
      } else if (btn.dataset.fx === 'off') {
        state.spotlight = false
        state.motion = false
        state.scrim = 0.75
      } else if (btn.dataset.fx === 'reset') {
        Object.assign(state, defaults)
      }
      apply()
      save()
      close()
    })

    onDocClick = (e) => {
      if (!menu || menu.contains(e.target)) return
      close()
    }
    document.addEventListener('click', onDocClick, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', close, true)
  }

  home.addEventListener('contextmenu', (e) => {
    // 链接上保留浏览器原菜单（新标签打开之类的还用得上）
    if (e.target.closest('a')) return
    e.preventDefault()
    open(e.clientX, e.clientY)
  })

  apply()

  // 测试用：?menu=1 时直接把菜单打开
  if (location.search.includes('menu=1')) {
    open(window.innerWidth / 2 - 110, 220)
  }
})()

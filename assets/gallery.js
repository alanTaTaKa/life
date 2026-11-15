// 图片页的灯箱：点开看大图、左右翻、下载、Esc 关闭。
// 没有 JS 时：照片本身就是链接，点一下浏览器会直接打开原图并且能另存为。

;(() => {
  const grid = document.querySelector('.photo-grid')
  if (!grid) return

  const links = [...grid.querySelectorAll('.photo-open')]
  if (!links.length) return

  let index = 0
  let box = null
  let lastFocus = null

  const captionOf = (a) => a.dataset.caption || ''

  function build() {
    const el = document.createElement('div')
    el.className = 'lightbox'
    el.setAttribute('role', 'dialog')
    el.setAttribute('aria-modal', 'true')
    el.setAttribute('aria-label', '查看图片')
    el.innerHTML = `
      <div class="lb-stage">
        <img class="lb-img" alt="" />
      </div>
      <div class="lb-bar">
        <span class="lb-caption"></span>
        <span class="lb-count"></span>
        <a class="lb-download" href="#" download>下载原图</a>
        <button type="button" class="lb-close" aria-label="关闭">×</button>
      </div>
      <button type="button" class="lb-prev" aria-label="上一张">‹</button>
      <button type="button" class="lb-next" aria-label="下一张">›</button>
    `
    document.body.appendChild(el)

    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.closest('.lb-close')) return close()
      if (e.target.closest('.lb-prev')) return go(-1)
      if (e.target.closest('.lb-next')) return go(1)
    })

    return el
  }

  function render() {
    const a = links[index]
    const img = box.querySelector('.lb-img')
    img.src = a.getAttribute('href')
    img.alt = captionOf(a)
    box.querySelector('.lb-caption').textContent = captionOf(a)
    box.querySelector('.lb-count').textContent = `${index + 1} / ${links.length}`
    box.querySelector('.lb-download').href = a.getAttribute('href')
    box.querySelector('.lb-prev').disabled = index === 0
    box.querySelector('.lb-next').disabled = index === links.length - 1
  }

  function open(i) {
    lastFocus = document.activeElement
    if (!box) box = build()
    index = i
    render()
    box.classList.add('on')
    document.documentElement.style.overflow = 'hidden'
    box.querySelector('.lb-close').focus()
  }

  function close() {
    if (!box) return
    box.classList.remove('on')
    document.documentElement.style.overflow = ''
    if (lastFocus) lastFocus.focus()
  }

  function go(delta) {
    const next = index + delta
    if (next < 0 || next >= links.length) return
    index = next
    render()
  }

  links.forEach((a, i) => {
    a.addEventListener('click', (e) => {
      // 让 ctrl/cmd+点击照常在新标签打开
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      open(i)
    })
  })

  document.addEventListener('keydown', (e) => {
    if (!box || !box.classList.contains('on')) return
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowLeft') go(-1)
    else if (e.key === 'ArrowRight') go(1)
  })

  // 测试用：?lb=1 直接打开第一张
  if (location.search.includes('lb=1')) open(0)
})()

// ui/nav.js — navegación entre tabs/screens
const SCREENS = ['s-home', 's-stats', 's-goals', 's-plan', 's-set']

export function go(sc) {
  SCREENS.forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    if (id === sc) {
      el.classList.add('on')
    } else {
      el.classList.remove('on')
    }
  })
  document.querySelectorAll('.nb').forEach(b => {
    b.classList.toggle('on', b.dataset.screen === sc)
  })
}

export function refreshCurrent() {
  const active = SCREENS.find(id => {
    const el = document.getElementById(id)
    return el && el.classList.contains('on')
  })
  if (active === 's-home') import('../features/home/render.js').then(m => m.renderHome())
}

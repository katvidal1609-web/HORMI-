// ui/nav.js — navegación entre tabs/screens
const SCREENS = ['s-home', 's-analysis', 's-goals', 's-plan', 's-settings']

export function go(sc) {
  SCREENS.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.style.display = id === sc ? '' : 'none'
  })
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('on', b.dataset.screen === sc)
  })
}

export function refreshCurrent() {
  const active = SCREENS.find(id => {
    const el = document.getElementById(id)
    return el && el.style.display !== 'none'
  })
  if (active === 's-home') import('../features/home/render.js').then(m => m.renderHome())
}

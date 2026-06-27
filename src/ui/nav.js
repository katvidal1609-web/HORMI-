// ui/nav.js — navegación entre tabs, igual que el original
const TABS = ['home', 'stats', 'goals', 'plan', 'set']

export function go(sc) {
  // sc puede venir como 'home' o 's-home' — normalizamos
  const tab = sc.startsWith('s-') ? sc.slice(2) : sc

  TABS.forEach(s => {
    document.getElementById('s-' + s)?.classList.toggle('on', s === tab)
    document.getElementById('n-' + s)?.classList.toggle('on', s === tab)
  })

  if (tab === 'home') {
    import('../features/home/render.js').then(m => m.renderHome())
    const sh = document.getElementById('s-home')
    if (sh) sh.scrollTop = 0
  }
}

export function refreshCurrent() {
  const active = TABS.find(s => document.getElementById('s-' + s)?.classList.contains('on'))
  if (active === 'home') import('../features/home/render.js').then(m => m.renderHome())
}

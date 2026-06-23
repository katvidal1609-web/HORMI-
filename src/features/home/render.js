// features/home/render.js — renderiza pantalla inicio
import { D } from '../../core/state.js'
import { td, fmt, getGreeting } from '../../core/fmt.js'
import { renderWk } from './calendar.js'
import { calcStreak } from './streak.js'
import { renderDayForHome } from './day.js'
import { initDaySwipe } from './swipe.js'

let _selDay = null
export function getSelDay() { return _selDay || td() }
export function setSelDay(ds) { _selDay = ds }

export function renderHome() {
  if (!_selDay) _selDay = td()

  const nameEl = document.getElementById('h-name')
  if (nameEl) nameEl.textContent = D.name || 'tú'

  const grEl = document.getElementById('hm-greeting')
  if (grEl) grEl.textContent = getGreeting()

  const today = td(), tm = today.slice(0, 7)
  const txsMes = D.transactions.filter(t => t.date.startsWith(tm))
  const txsHoy = D.transactions.filter(t => t.date === today)

  const elStr = document.getElementById('stat-streak')
  if (elStr) elStr.textContent = calcStreak()

  const elMon = document.getElementById('stat-month')
  if (elMon) elMon.textContent = 'S/' + txsMes.reduce((s, t) => s + t.amount, 0).toFixed(0)

  const elTod = document.getElementById('stat-today')
  if (elTod) {
    const todayAmt = txsHoy.reduce((s, t) => s + t.amount, 0)
    elTod.textContent = 'S/' + todayAmt.toFixed(0)
    elTod.style.color = todayAmt > 0 ? 'var(--red)' : 'var(--t1)'
  }

  renderWk()
  renderDayForHome(false)
  initDaySwipe()
}

export function selectDay(ds) {
  _selDay = ds
  renderWk()
  renderDayForHome(true)
}

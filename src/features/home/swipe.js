// features/home/swipe.js — swipe para navegar días
import { td } from '../../core/fmt.js'
import { getSelDay, selectDay } from './render.js'

let _ready = false, _x = 0, _y = 0

export function initDaySwipe() {
  if (_ready) return
  _ready = true
  const el = document.getElementById('day-content')
  if (!el) return

  el.addEventListener('touchstart', e => {
    _x = e.touches[0].clientX
    _y = e.touches[0].clientY
  }, { passive: true })

  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - _x
    const dy = e.changedTouches[0].clientY - _y
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
    const cur = new Date((getSelDay() || td()) + 'T12:00:00')
    if (dx < 0) {
      const next = new Date(cur); next.setDate(cur.getDate() + 1)
      const nds = next.toISOString().slice(0, 10)
      if (nds <= td()) selectDay(nds)
    } else {
      const prev = new Date(cur); prev.setDate(cur.getDate() - 1)
      selectDay(prev.toISOString().slice(0, 10))
    }
  }, { passive: true })
}

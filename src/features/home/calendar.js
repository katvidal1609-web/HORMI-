// features/home/calendar.js — semana y calendario mensual
import { D } from '../../core/state.js'
import { td, dlbl } from '../../core/fmt.js'
import { MO } from '../../core/constants.js'
import { getSelDay, selectDay } from './render.js'

let wkOffset = 0

export function weekStart(off) {
  const now = new Date(), day = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + off * 7)
  mon.setHours(0, 0, 0, 0)
  return mon
}

export function navWeek(dir) {
  if (dir > 0 && wkOffset >= 0) return
  wkOffset += dir
  renderWk()
}

export function renderWk() {
  const bud = D.budget || 30, today = td(), sel = getSelDay()
  const start = weekStart(wkOffset)
  const end = new Date(start); end.setDate(start.getDate() + 6)
  const sm = start.getMonth(), em = end.getMonth()
  const lbl = sm === em
    ? `${start.getDate()}–${end.getDate()} ${MO[sm].slice(0,3).toUpperCase()}`
    : `${start.getDate()} ${MO[sm].slice(0,3).toUpperCase()} – ${end.getDate()} ${MO[em].slice(0,3).toUpperCase()}`

  const lblEl = document.getElementById('wk-lbl')
  if (lblEl) lblEl.textContent = lbl

  const nextEl = document.getElementById('wk-next')
  if (nextEl) nextEl.disabled = wkOffset >= 0

  const DN = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
  let html = ''
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const ds = d.toISOString().slice(0, 10)
    const isFut = ds > today, isT = ds === today, isSel = ds === sel
    const amt = isFut ? 0 : D.transactions
      .filter(t => t.date === ds && t.isHormi).reduce((s, t) => s + t.amount, 0)
    const dc = isSel ? 'transparent' : amt === 0 ? 'transparent'
      : amt > bud ? 'var(--red)' : amt > bud * .75 ? 'var(--amber)' : 'var(--lime)'
    const hasTx = !isFut && D.transactions.some(t => t.date === ds)
    html += `<div class="dp${isT?' td':''}${isFut?' fut':''}${isSel?' sel':''}${hasTx?' has-tx':''}" ${isFut ? '' : `onclick="selectDay('${ds}')"`}>
      <div class="dp-n">${DN[i]}</div>
      <div class="dp-d2">${d.getDate()}</div>
      <div class="dp-a">${!isFut && amt > 0 ? 'S/' + amt.toFixed(0) : '—'}</div>
      <div class="dp-d" style="background:${dc}"></div>
    </div>`
  }
  const row = document.getElementById('wk-row')
  if (row) row.innerHTML = html
}

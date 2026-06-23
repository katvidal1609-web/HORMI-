// features/home/day.js — renderiza feed del día seleccionado
import { D } from '../../core/state.js'
import { td, fmt, ttime } from '../../core/fmt.js'
import { CATS } from '../../core/constants.js'
import { getSelDay } from './render.js'

export function renderDayForHome(animate) {
  const el = document.getElementById('day-content')
  if (!el) return
  if (animate) { el.classList.remove('day-cnt-in'); void el.offsetWidth; el.classList.add('day-cnt-in') }

  const today = td(), ds = getSelDay()

  // budget card
  const bcEl = document.getElementById('bc-day')
  if (bcEl) {
    if (ds > today) { bcEl.innerHTML = ''; return }
    const bud = D.budget || 30
    const hmTotal = D.transactions.filter(t => t.date === ds && t.isHormi).reduce((s, t) => s + t.amount, 0)
    const pct = Math.min(hmTotal / bud * 100, 100)
    const isOver = hmTotal > bud, isWarn = hmTotal > bud * .75
    const cls = isOver ? 'over' : isWarn ? 'warn' : 'ok'
    const fc = isOver ? 'var(--red)' : isWarn ? 'var(--amber)' : 'var(--lime)'
    bcEl.innerHTML = `<div class="bc" style="margin:14px 18px">
      <div class="bc-row">
        <div>
          <div class="bc-lbl">hormigas${ds === today ? ' hoy' : ' este día'}</div>
          <div class="bc-amt ${cls}">${fmt(hmTotal)}</div>
          <div class="bc-meta">${isOver ? `S/ ${(hmTotal-bud).toFixed(2)} sobre el límite` : `de S/ ${bud.toFixed(2)} límite`}</div>
        </div>
        ${ds === today ? `<button class="lim-btn" onclick="openModal('m-budget')">límite diario</button>` : ''}
      </div>
      <div class="prog"><div class="prog-f" style="width:${pct}%;background:${fc}"></div></div>
      <div class="bc-ft"><span>${Math.round(pct)}% usado</span><span>${isOver ? '¡límite superado!' : `S/ ${(bud-hmTotal).toFixed(2)} disponible`}</span></div>
    </div>`
  }

  // feed
  const feedEl = document.getElementById('feed')
  if (!feedEl) return

  if (ds > today) {
    feedEl.innerHTML = `<div class="empty" style="padding:60px 20px"><div class="empty-ic">🔒</div><div style="font-size:15px;color:var(--t2)">Este día aún no llegó</div></div>`
    return
  }

  const txs = D.transactions.filter(t => t.date === ds).sort((a, b) => new Date(b.ts) - new Date(a.ts))
  if (!txs.length) {
    feedEl.innerHTML = `<div class="empty-today">
      <div class="empty-today-ic"><i data-lucide="sparkles" style="width:24px;height:24px;color:#407178"></i></div>
      <div class="empty-today-t">Sin hormigas ${ds === today ? 'hoy' : 'este día'}</div>
      <div class="empty-today-s">${ds === today ? 'Toca + para registrar si gastas algo' : 'Un día limpio 👌'}</div>
    </div>`
    if (window.lucide) lucide.createIcons()
    return
  }

  feedEl.innerHTML = txs.map(t => {
    const tt = ttime(t.ts?.slice(11, 16) || '')
    const catName = (CATS.find(c => c.id === t.category) || CATS[CATS.length-1]).l
    return `<div class="tx${t.isHormi ? ' hm' : ''}${t.isDraft ? ' draft' : ''}" onclick="openTxDetail(${t.id})">
      <div class="tx-ic">${t.emoji || '🫙'}</div>
      <div class="tx-nfo"><div class="tx-nm">${t.description}</div><div class="tx-ct">${catName}${tt ? ` · ${tt}` : ''}</div></div>
      <div class="tx-r"><div class="tx-am">${fmt(t.amount)}</div>${t.isDraft ? '<div class="draft-badge">borrador</div>' : t.isHormi ? '<div class="hm-tag">hormiga</div>' : ''}</div>
    </div>`
  }).join('')
}

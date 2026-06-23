// features/home/streak.js — calcula racha de días bajo límite
import { D } from '../../core/state.js'
import { td } from '../../core/fmt.js'

export function calcStreak() {
  const bud = D.budget || 30
  const today = td()
  const days = [...new Set(D.transactions.map(t => t.date))].sort().reverse()
  let streak = 0
  let cur = new Date(today + 'T12:00:00')

  for (let i = 0; i < 90; i++) {
    const ds = cur.toISOString().slice(0, 10)
    if (ds > today) { cur.setDate(cur.getDate() - 1); continue }
    const dayTotal = D.transactions
      .filter(t => t.date === ds && t.isHormi)
      .reduce((s, t) => s + t.amount, 0)
    if (dayTotal <= bud) streak++
    else break
    cur.setDate(cur.getDate() - 1)
  }
  return streak
}

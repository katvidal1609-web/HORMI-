// features/goals/manage.js — crear, evaluar y renderizar metas
import { D, save } from '../../core/state.js'
import { td, fmt } from '../../core/fmt.js'
import { CATS } from '../../core/constants.js'
import { saveUserData } from '../settings/profile.js'
import { toast } from '../../ui/toast.js'
import { closeOv } from '../../ui/modals.js'

export function calcGoalSpent(goal) {
  const m = (td()).slice(0, 7)
  return D.transactions
    .filter(t => t.date.startsWith(m) && (goal.hormi ? t.description?.toLowerCase().includes(goal.hormi.toLowerCase()) : t.category === goal.cat))
    .reduce((s, t) => s + t.amount, 0)
}

export async function saveGoalMulti() {
  const month = td().slice(0, 7)
  const existing = D.goals.find(g => g.month === month)
  if (existing) D.goals = D.goals.filter(g => g.month !== month)

  const budgetEl = document.getElementById('mg-budget')
  const budget = parseFloat(budgetEl?.value) || 0
  if (!budget) return toast('Ingresa el presupuesto', 'warn')

  const newGoal = { month, budget, created: new Date().toISOString() }

  // hormi goal
  if (window._mgHormi) newGoal.hormi = window._mgHormi
  // cat goal
  const selCat = document.querySelector('#mg-cats .sel')
  if (selCat) newGoal.cat = selCat.dataset.cat

  D.goals.push(newGoal)
  save()
  await saveUserData()
  closeOv('m-goal')
  toast('Meta guardada ✓', 'ok')
}

export function evaluateGoals() {
  const today = td(), month = today.slice(0, 7)
  const goal = D.goals.find(g => g.month === month)
  if (!goal) return
  const spent = calcGoalSpent(goal)
  if (spent > goal.budget) toast(`⚠️ Superaste tu meta: ${fmt(spent)} / ${fmt(goal.budget)}`, 'warn', 4000)
}

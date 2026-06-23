// features/settings/budget.js — límite diario
import { D, save } from '../../core/state.js'
import { saveUserData } from './profile.js'
import { toast } from '../../ui/toast.js'
import { closeOv } from '../../ui/modals.js'

export function openBudgetModal() {
  const el = document.getElementById('bud-in')
  if (el) el.value = D.budget
  import('../../ui/modals.js').then(m => m.openModal('m-budget'))
}

export async function saveBudget() {
  const b = parseFloat(document.getElementById('bud-in')?.value)
  if (!isNaN(b) && b > 0) D.budget = b
  save()
  await saveUserData()
  // actualizar display en ajustes
  const disp = document.getElementById('disp-budget')
  if (disp) disp.textContent = `S/ ${D.budget} ›`
  closeOv('m-budget')
  toast('Límite actualizado ✓', 'ok')
  // re-render home para reflejar nuevo límite
  import('../home/render.js').then(m => m.renderHome())
}

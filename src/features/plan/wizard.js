// features/plan/wizard.js — estado y navegación del planificador
import { D, save } from '../../core/state.js'
import { toast } from '../../ui/toast.js'

export let _planStage = 1
export let _planFD = {
  objetivo: '', objetivoCustom: '', metaTotal: 0, meses: 6,
  ingresoFijo: 0, ingresoVariable: 0,
  gastosFijos: [{ label: 'Alquiler', monto: 500 }, { label: 'Luz/Agua', monto: 80 }],
  alimentacion: 0, transporte: 0, ocio: 0,
}

export const PLAN_CHIPS = ['Viajar', 'Comprar algo', 'Ahorrar 3 meses', 'Pagar deuda', 'Fondo emergencia']
export const PLAN_MO = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24]

export function planSaveStage(s) {
  if (s === 1) {
    _planFD.metaTotal = parseFloat(document.getElementById('pl-amt')?.value) || _planFD.metaTotal
    _planFD.meses     = parseInt(document.getElementById('pl-meses')?.value) || _planFD.meses
    _planFD.objetivo  = document.getElementById('pl-custom')?.value || _planFD.objetivo
  } else if (s === 2) {
    _planFD.ingresoFijo     = parseFloat(document.getElementById('pl-ingfijo')?.value) || 0
    _planFD.ingresoVariable = parseFloat(document.getElementById('pl-ingvar')?.value) || 0
  } else if (s === 4) {
    _planFD.alimentacion = parseFloat(document.getElementById('pl-alim')?.value) || 0
    _planFD.transporte   = parseFloat(document.getElementById('pl-trans')?.value) || 0
    _planFD.ocio         = parseFloat(document.getElementById('pl-ocio')?.value) || 0
  }
}

export function planNext(s) {
  planSaveStage(s)
  if (s === 1 && !_planFD.metaTotal) return toast('Ingresa el monto de tu meta', 'warn')
  if (s === 2 && !(_planFD.ingresoFijo + _planFD.ingresoVariable)) return toast('Ingresa tus ingresos', 'warn')
  import('./render.js').then(m => m.renderPlanWizard(s + 1))
}

export function planBack(s) {
  planSaveStage(s)
  import('./render.js').then(m => m.renderPlanWizard(s - 1))
}

export function planEdit() {
  D.planOutput = null
  save()
  import('./render.js').then(m => m.renderPlanWizard(1))
}

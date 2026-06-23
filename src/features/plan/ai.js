// features/plan/ai.js — genera plan con IA via claude-proxy
import { PROXY_URL } from '../../core/config.js'
import { sb } from '../../core/supabase.js'
import { D, save } from '../../core/state.js'

export async function generatePlan(fd) {
  const { data: { session } } = await sb.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Sin sesión')

  const hormiAvg = D.transactions.filter(t => t.isHormi).length
    ? D.transactions.filter(t => t.isHormi).reduce((s, t) => s + t.amount, 0) / 30
    : 0

  const prompt = `Eres un planificador financiero peruano. Genera un plan de ahorro personalizado en JSON.
Datos del usuario:
- Objetivo: ${fd.objetivo}
- Meta total: S/ ${fd.metaTotal} en ${fd.meses} meses
- Ingresos: S/ ${fd.ingresoFijo + fd.ingresoVariable}/mes
- Gastos fijos: S/ ${fd.gastosFijos.reduce((s,g)=>s+(g.monto||0),0)}/mes
- Gastos variables: alimentación S/${fd.alimentacion}, transporte S/${fd.transporte}, ocio S/${fd.ocio}
- Promedio gastos hormiga: S/ ${Math.round(hormiAvg * 30)}/mes

Responde SOLO JSON: {"ahorroPosible":0,"hormisSugeridas":0,"ajustes":[{"categoria":"...","sugerencia":"...","ahorro":0}],"mensaje":"...","viable":true}`

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6', max_tokens: 1000,
      system: 'Responde SOLO JSON válido sin markdown.',
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await res.json()
  const text = data.content?.find(b => b.type === 'text')?.text || '{}'
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Respuesta inválida')

  const plan = JSON.parse(match[0])
  plan.fd = fd
  D.planOutput = plan
  save()
  return plan
}

// core/fmt.js — formateadores reutilizables
import { MO } from './constants.js'

export const fmt = (n) => 'S/ ' + (+n).toFixed(2)

export const td = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`
}

export const dlbl = (ds) => {
  const d = new Date(ds + 'T12:00:00')
  return `${d.getDate()} ${MO[d.getMonth()].slice(0,3)}`
}

export const ttime = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${suffix}`
}

export const capFirst = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

export const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

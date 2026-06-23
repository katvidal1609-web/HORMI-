// features/analysis/export.js — exportar transacciones a CSV
import { D } from '../../core/state.js'

export function exportCSV() {
  if (!D.transactions.length) return

  const headers = ['Fecha','Descripción','Monto','Categoría','¿Hormiga?','Fuente']
  const rows = D.transactions.map(t => [
    t.date,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    t.amount,
    t.category,
    t.isHormi ? 'Sí' : 'No',
    t.source || 'manual'
  ])

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hormi-gastos-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

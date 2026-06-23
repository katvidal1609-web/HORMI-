// features/transactions/duplicate.js — detectar duplicados
import { D } from '../../core/state.js'
import { td } from '../../core/fmt.js'

export function checkDuplicate(desc, excludeId) {
  if (!desc) return null
  const today = td()
  return D.transactions.find(t =>
    t.id !== excludeId &&
    t.date === today &&
    t.description?.toLowerCase() === desc.toLowerCase()
  ) || null
}

export function checkAndShowDuplicate(desc) {
  const dup = checkDuplicate(desc)
  const el = document.getElementById('dup-warn')
  if (!el) return
  if (dup) {
    el.textContent = `⚠️ Ya registraste "${desc}" hoy`
    el.style.display = 'block'
  } else {
    el.style.display = 'none'
  }
}

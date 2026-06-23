// ui/modals.js — abrir y cerrar modales y sheets
export function openModal(id) {
  const el = document.getElementById(id)
  if (el) el.classList.add('open')
}

export function closeOv(id) {
  const el = document.getElementById(id)
  if (el) el.classList.remove('open')
}

export function maybeClose(e, id) {
  if (e.target === document.getElementById(id)) closeOv(id)
}

export function openSheet(id) {
  const el = document.getElementById(id)
  if (el) el.classList.add('open')
}

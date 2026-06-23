// ui/toast.js — notificaciones toast
let _timer = null

export function toast(msg, type = '', duration = 2600) {
  const el = document.getElementById('toast')
  if (!el) return
  el.innerHTML = msg
  el.className = `toast show ${type}`
  clearTimeout(_timer)
  _timer = setTimeout(() => { el.className = 'toast' }, duration)
}

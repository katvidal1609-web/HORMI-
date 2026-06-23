// features/share/canvas.js — genera tarjeta de compartir en canvas
import { fmt } from '../../core/fmt.js'
import { D } from '../../core/state.js'

export async function buildShareCanvas(weekTotal, weekCount, daysOk) {
  const W = 700, H = 400
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Fondo degradado
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#d3e458')
  grad.addColorStop(0.5, '#5A9430')
  grad.addColorStop(1, '#080808')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Logo
  const logo = new Image()
  logo.crossOrigin = 'anonymous'
  await new Promise(res => {
    logo.onload = res; logo.onerror = res
    logo.src = fetch('isotipo-dark.png')
      .then(r => r.blob())
      .then(b => URL.createObjectURL(b))
  })
  const lh = 48
  const lw = logo.naturalWidth && logo.naturalHeight
    ? Math.round(logo.naturalWidth / logo.naturalHeight * lh) : 48
  if (logo.complete && logo.naturalHeight) ctx.drawImage(logo, 28, 16, lw, lh)

  // Wordmark
  ctx.fillStyle = '#0D0D0D'
  ctx.font = '800 30px Lexend, sans-serif'
  ctx.fillText('HORMI', 28 + lw + 12, 48)
  ctx.fillStyle = 'rgba(8,8,8,0.70)'
  ctx.font = '400 14px Lexend, sans-serif'
  ctx.fillText('menos hormis, más money', 28, 82)

  // Monto principal
  ctx.fillStyle = '#fff'
  ctx.font = '800 72px Lexend, sans-serif'
  ctx.fillText(fmt(weekTotal), 28, 200)
  ctx.font = '400 18px Lexend, sans-serif'
  ctx.fillText('en hormigas esta semana', 28, 230)

  return canvas
}

export function downloadCanvas(canvas, filename = 'hormi-progreso.png') {
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = filename
  a.click()
}

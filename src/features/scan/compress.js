// features/scan/compress.js — comprime imagen para thumbnail
export function compressThumb(b64, mime = 'image/jpeg') {
  return new Promise(res => {
    const img = new Image()
    img.onload = () => {
      const MAX = 200
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width  = img.width  * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      res(canvas.toDataURL('image/jpeg', 0.6).split(',')[1])
    }
    img.onerror = () => res(null)
    img.src = `data:${mime};base64,${b64}`
  })
}

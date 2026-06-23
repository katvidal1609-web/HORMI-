// features/scan/heic.js — convierte cualquier imagen a JPEG base64
export function toJpegBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
        res(canvas.toDataURL('image/jpeg', 0.92).split(',')[1])
      }
      img.onerror = () => rej(new Error('No se pudo leer la imagen'))
      img.src = e.target.result
    }
    reader.onerror = rej
    reader.readAsDataURL(file)
  })
}

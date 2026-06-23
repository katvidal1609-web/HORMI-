// features/scan/parse.js — envía imagen a IA y parsea respuesta
import { SCAN_URL } from '../../core/config.js'
import { sb } from '../../core/supabase.js'

const PROMPT = `Eres un extractor de datos de comprobantes de pago peruanos. Analiza la imagen.
Si NO es un comprobante válido: {"error":"no_receipt","message":"No parece un comprobante"}
Si ES válido pero sin producto: {"error":"no_product","message":"Sin producto identificable","amount":0}
Si ES válido con producto: extrae items. Para boletas con múltiples items devuelve array:
[{"descripcion":"...","monto":0.00,"categoria_sugerida":"food|drink|snack|del|trans|health|other"}]
Para un solo item: {"amount":0.00,"description":"nombre comercial","date":"DD/MM/YYYY","time":"HH:MM"}
Responde SOLO JSON válido, sin texto previo ni markdown.`

export async function scanImage(b64, mime = 'image/jpeg') {
  const { data: { session } } = await sb.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Sin sesión')

  const res = await fetch(SCAN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ image_base64: b64, media_type: mime, prompt: PROMPT })
  })

  const raw = await res.text()
  const match = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (!match) throw new Error('Respuesta inválida: ' + raw.slice(0, 80))
  return JSON.parse(match[1])
}

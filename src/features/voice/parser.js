// features/voice/parser.js — envía texto de voz a IA
import { SCAN_URL } from '../../core/config.js'
import { sb } from '../../core/supabase.js'

export async function parseVoice(text) {
  const { data: { session } } = await sb.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Sin sesión')

  const res = await fetch(SCAN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ voice_text: text })
  })

  const raw = await res.text()
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Respuesta inválida')
  return JSON.parse(match[0])
}

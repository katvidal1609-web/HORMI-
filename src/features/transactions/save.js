// features/transactions/save.js — guardar transacción en Supabase
import { sb, supaUser } from '../../core/supabase.js'
import { toast } from '../../ui/toast.js'

export async function saveTx(tx) {
  if (!supaUser) return
  const { error } = await sb.from('transactions').upsert({
    id: String(tx.id),
    user_id: supaUser.id,
    amount: tx.amount,
    description: tx.description,
    category: tx.category,
    date: tx.date,
    ts: tx.ts,
    is_hormi: tx.isHormi,
    source: tx.source || 'manual',
    emoji: tx.emoji,
    image_thumb: tx.imageThumb || null,
  })
  if (error) toast('Error al guardar (' + error.message + ')', 'err')
}

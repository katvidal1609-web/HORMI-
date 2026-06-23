// features/transactions/delete.js — eliminar transacción
import { sb, supaUser } from '../../core/supabase.js'

export async function deleteTxRemote(id) {
  if (!supaUser) return
  await sb.from('transactions').delete().eq('id', String(id))
}

// features/settings/profile.js — cargar y guardar perfil desde Supabase
import { sb, supaUser, setSupaUser } from '../../core/supabase.js'
import { D, save } from '../../core/state.js'
import { toast } from '../../ui/toast.js'

let _loading = false

export async function loadUserData(userId) {
  if (_loading) return
  _loading = true
  try {
    const { data: profile } = await sb.from('profiles')
      .select('onboarded,name,is_pro,budget,threshold,hormis,goals,trial_start,trial_used,guide_seen')
      .eq('id', userId).maybeSingle()

    let finalProfile = profile
    if (!profile) {
      const { data: newP } = await sb.from('profiles')
        .upsert({ id: userId, onboarded: false }, { onConflict: 'id' })
        .select('onboarded,name,is_pro,budget,threshold,hormis,goals,trial_start,trial_used,guide_seen')
        .maybeSingle()
      finalProfile = newP
    }

    if (finalProfile) {
      D.onboarded   = finalProfile.onboarded === true
      D.name        = finalProfile.name || ''
      D.isPro       = finalProfile.is_pro || false
      D.budget      = finalProfile.budget || 30
      D.threshold   = finalProfile.threshold || 25
      D.hormis      = finalProfile.hormis || []
      D.goals       = finalProfile.goals || []
      D.trialUsed   = finalProfile.trial_used || false
      D.guideSeen   = finalProfile.guide_seen || false
    }

    const { data: txs } = await sb.from('transactions')
      .select('*').eq('user_id', userId).order('ts', { ascending: false })

    if (txs?.length) {
      D.transactions = txs.map(t => ({
        id: t.id, date: t.date, ts: t.ts, amount: t.amount,
        description: t.description, category: t.category, emoji: t.emoji,
        isHormi: t.is_hormi, isDraft: t.is_draft, hasTime: t.has_time,
        imageThumb: t.image_thumb, source: t.source,
      }))
    }
    save()
  } catch (e) {
    console.error('loadUserData error:', e)
  } finally {
    _loading = false
  }
}

export async function saveUserData() {
  if (!supaUser) return
  await sb.from('profiles').upsert({
    id: supaUser.id,
    name: D.name, is_pro: D.isPro, budget: D.budget,
    threshold: D.threshold, hormis: D.hormis, goals: D.goals,
    onboarded: D.onboarded,
  }, { onConflict: 'id' })
}

export async function saveEditProfile() {
  const name  = document.getElementById('ep-name')?.value.trim()
  if (!name) return toast('Ingresa tu nombre', 'warn')
  D.name = name
  save()
  await saveUserData()
  document.getElementById('h-name').textContent = name
  toast('Perfil actualizado ✓', 'ok')
}

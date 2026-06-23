// features/auth/session.js — sesión, signOut, deleteAccount
import { sb, setSupaUser } from '../../core/supabase.js'
import { toast } from '../../ui/toast.js'
import { D, save } from '../../core/state.js'

export async function signOut() {
  await sb.auth.signOut()
  setSupaUser(null)
  D.isPro = false
  save()
  location.reload()
}

export async function doDeleteAccount() {
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return
  await sb.from('profiles').delete().eq('id', user.id)
  await sb.auth.admin?.deleteUser(user.id)
  await signOut()
}

export function showAuthScreen(id) {
  document.querySelectorAll('.auth-screen, .wc-new').forEach(el => {
    el.classList.remove('on')
    el.style.display = 'none'
  })
  const target = document.getElementById(id)
  if (target) { target.style.display = 'flex'; target.classList.add('on') }
}

// features/auth/login.js — login con email y contraseña
import { sb } from '../../core/supabase.js'
import { toast } from '../../ui/toast.js'
import { showAuthScreen } from './router.js'

export async function doLogin() {
  const email = document.getElementById('li-email')?.value.trim()
  const pass  = document.getElementById('li-pass')?.value
  if (!email || !pass) return toast('Completa todos los campos', 'warn')

  const { error } = await sb.auth.signInWithPassword({ email, password: pass })
  if (error) return toast(error.message, 'err')
}

export async function doForgotPassword() {
  const email = document.getElementById('fp-email')?.value.trim()
  if (!email) return toast('Ingresa tu email', 'warn')

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}/?reset=1`
  })
  if (error) return toast(error.message, 'err')
  toast('Revisa tu correo ✓', 'ok')
  showAuthScreen('s-login')
}

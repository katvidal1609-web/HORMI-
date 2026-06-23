// features/auth/register.js — registro con email y contraseña
import { sb } from '../../core/supabase.js'
import { toast } from '../../ui/toast.js'
import { showAuthScreen } from './router.js'

export async function doRegister() {
  const email = document.getElementById('rg-email')?.value.trim()
  const pass  = document.getElementById('rg-pass')?.value
  const name  = document.getElementById('rg-name')?.value.trim()
  if (!email || !pass) return toast('Completa todos los campos', 'warn')
  if (pass.length < 6) return toast('Contraseña mínimo 6 caracteres', 'warn')

  const { error } = await sb.auth.signUp({
    email, password: pass,
    options: { data: { name }, emailRedirectTo: `${location.origin}/` }
  })
  if (error) return toast(error.message, 'err')
  showAuthScreen('s-confirm')
}

export async function doResendEmail(email) {
  const { error } = await sb.auth.resend({ type: 'signup', email })
  if (error) return toast(error.message, 'err')
  toast('Email reenviado ✓', 'ok')
}

// main.js — entry point, inicializa la app
import { load, D, save } from './core/state.js'
import { sb, setSupaUser } from './core/supabase.js'
import { go } from './ui/nav.js'
import { showAuthScreen } from './features/auth/session.js'

// Exponer funciones globales para onclick en HTML (temporalmente)
import { doLogin, doForgotPassword } from './features/auth/login.js'
import { doRegister, doResendEmail } from './features/auth/register.js'
import { doGoogleAuth } from './features/auth/google.js'
import { signOut } from './features/auth/session.js'
import { toast } from './ui/toast.js'
import { openModal, closeOv, maybeClose, openSheet } from './ui/modals.js'

// Exponer funciones globales inmediatamente
window.showAuthScreen = showAuthScreen
window.doLogin = doLogin
window.doForgotPassword = doForgotPassword
window.doRegister = doRegister
window.doResendEmail = doResendEmail
window.doGoogleAuth = doGoogleAuth
window.signOut = signOut
window.toast = toast
window.openModal = openModal
window.closeOv = closeOv
window.maybeClose = maybeClose
window.openSheet = openSheet
window.go = go

async function initApp() {
  load()

  // Manejar callback de Google OAuth (PKCE)
  const params = new URLSearchParams(window.location.search)
  if (params.get('code')) {
    const { data, error } = await sb.auth.exchangeCodeForSession(window.location.href)
    if (!error && data.session) {
      window.history.replaceState({}, '', '/')
    }
  }

  const { data: { session } } = await sb.auth.getSession()

  if (session?.user) {
    setSupaUser(session.user)
    const { loadUserData } = await import('./features/settings/profile.js')
    await loadUserData(session.user.id)
    document.getElementById('s-main')?.style.setProperty('display', 'flex')
    document.getElementById('s-welcome')?.style.setProperty('display', 'none')
    const { go } = await import('./ui/nav.js')
    go('s-home')
  } else {
    showAuthScreen('s-welcome')
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      setSupaUser(session.user)
      const { loadUserData } = await import('./features/settings/profile.js')
      await loadUserData(session.user.id)
      document.getElementById('s-main')?.style.setProperty('display', 'flex')
      document.getElementById('s-welcome')?.style.setProperty('display', 'none')
      const { go } = await import('./ui/nav.js')
      go('s-home')
    }
    if (event === 'SIGNED_OUT') {
      showAuthScreen('s-welcome')
    }
  })
}

document.addEventListener('DOMContentLoaded', initApp)

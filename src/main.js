// main.js — entry point, inicializa la app
import { load, D, save } from './core/state.js'
import { sb, setSupaUser, supaUser } from './core/supabase.js'
import { go } from './ui/nav.js'
import { showAuthScreen } from './features/auth/session.js'
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

// Auth state change — igual que hormi2.html
sb.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth event:', event, session?.user?.email)
  if (event === 'SIGNED_IN' && session?.user) {
    if (supaUser?.id === session.user.id) return
    setSupaUser(session.user)
    showReady('¡Hola! 🐜', 'Cargando tu cuenta...')
    return
  }
  if (event === 'SIGNED_OUT') {
    setSupaUser(null)
    localStorage.removeItem('hormi_v2')
    showAuthScreen('s-welcome')
  }
  if (event === 'TOKEN_REFRESHED' && !session) {
    setSupaUser(null)
    localStorage.removeItem('hormi_v2')
    showAuthScreen('s-welcome')
  }
})

async function initApp() {
  load()
  const url = new URL(window.location.href)
  const hasCode = url.searchParams.has('code')

  if (hasCode) {
    console.log('OAuth callback — procesando code...')
    // Dejar que Supabase con detectSessionInUrl:true procese el code
    const { data: { session } } = await sb.auth.getSession()
    window.history.replaceState({}, '', '/')
    if (session?.user) {
      setSupaUser(session.user)
      showReady('¡Hola! 🐜', 'Cargando tu cuenta...')
    } else {
      showAuthScreen('s-welcome')
    }
    return
  }

  // Sin code — verificar sesión existente
  try {
    const { data: { session } } = await sb.auth.getSession()
    if (session?.user) {
      setSupaUser(session.user)
      const { loadUserData } = await import('./features/settings/profile.js')
      await loadUserData(session.user.id)
      showMain()
    } else {
      showAuthScreen('s-welcome')
    }
  } catch (e) {
    console.error('initApp:', e)
    showAuthScreen('s-welcome')
  }
}

function showReady(title, msg) {
  document.querySelectorAll('.wc-new, .auth-screen, #s-main').forEach(el => {
    el.style.display = 'none'
  })
  const el = document.getElementById('s-ready')
  if (el) {
    el.style.display = 'flex'
    const t = document.getElementById('ready-title')
    const m = document.getElementById('ready-msg')
    if (t) t.textContent = title
    if (m) m.textContent = msg
  }
}

function showMain() {
  document.querySelectorAll('.wc-new, .auth-screen').forEach(el => {
    el.style.display = 'none'
  })
  const main = document.getElementById('main')
  if (main) main.style.display = 'block'
  go('s-home')
}

async function onReadyContinue() {
  const btn = document.getElementById('ready-btn')
  if (btn) { btn.disabled = true; btn.textContent = 'Cargando...' }
  try {
    const { data: { session } } = await sb.auth.getSession()
    if (session?.user) {
      const { loadUserData } = await import('./features/settings/profile.js')
      await loadUserData(session.user.id)
      showMain()
    } else {
      showAuthScreen('s-welcome')
    }
  } catch (e) {
    console.error('onReadyContinue:', e)
    showAuthScreen('s-welcome')
  }
}

// Exponer para onclick en HTML
window.showMain = showMain
window.showReady = showReady
window.onReadyContinue = onReadyContinue

document.addEventListener('DOMContentLoaded', initApp)

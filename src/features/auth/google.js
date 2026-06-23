// features/auth/google.js — login con Google OAuth
import { sb } from '../../core/supabase.js'
import { toast } from '../../ui/toast.js'

export async function doGoogleAuth() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}/` }
  })
  if (error) toast(error.message, 'err')
}

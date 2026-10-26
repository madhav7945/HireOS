import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore, isAuthConfigured } from '../../store'
import GoogleIcon from './GoogleIcon'

// Self-contained "Continue with Google" button. Kicks off Supabase OAuth (redirect
// to Google then back to /auth/callback). In demo mode (no Supabase) it just enters
// the demo workspace so the button is never a dead end.
export default function GoogleSignInButton() {
  const realAuth = isAuthConfigured()
  const navigate = useNavigate()
  const { demoLogin, signInWithGoogle } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    if (!realAuth) { demoLogin(); navigate('/'); return }
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      toast.error(err?.message || 'Google sign-in failed')
      setLoading(false)
    }
  }

  return (
    <button type="button" className="login-google-btn" onClick={onClick} disabled={loading}>
      {loading
        ? <span className="login-spinner login-spinner-dark" />
        : <><GoogleIcon size={18} /> Continue with Google</>}
    </button>
  )
}

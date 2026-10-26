import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Logo from '../components/ui/Logo'

// OAuth landing page. After Google sends the user back here, the Supabase client
// parses the session out of the URL (detectSessionInUrl is on by default) and
// fires SIGNED_IN. We wait for the session, then route into the app. A short
// timeout guards against a malformed/expired redirect so the user is never stuck.
export default function AuthCallback() {
  const navigate = useNavigate()
  const settled = useRef(false)

  useEffect(() => {
    const go = (path) => { if (!settled.current) { settled.current = true; navigate(path, { replace: true }) } }

    // If the session is already available, go straight in.
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) go('/')
    })

    // Otherwise wait for the auth event that the URL parse triggers.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) go('/')
      else if (event === 'SIGNED_OUT') go('/login')
    })

    // Safety net: never strand the user on a blank callback screen.
    const t = setTimeout(() => go('/login'), 8000)
    return () => { clearTimeout(t); sub?.subscription?.unsubscribe?.() }
  }, [navigate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 20, background: 'var(--surface-bg)' }}>
      <Logo size={40} withWordmark wordmarkSize={32} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary, #a0a0cc)' }}>
        <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'var(--brand-primary, #6C5CE7)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
        Signing you in…
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

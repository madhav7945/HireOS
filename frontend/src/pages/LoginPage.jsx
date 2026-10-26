import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, isAuthConfigured } from '../store'
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, User } from 'lucide-react'
import Logo from '../components/ui/Logo'
import GoogleSignInButton from '../components/ui/GoogleSignInButton'
import toast from 'react-hot-toast'
import './LoginPage.css'

export default function LoginPage() {
  const realAuth = isAuthConfigured()
  const [mode, setMode] = useState('signin') // signin | signup
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(realAuth ? '' : 'sarah@techcorp.io')
  const [password, setPassword] = useState(realAuth ? '' : 'demo123')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { demoLogin, signIn, signUp } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    // No backend configured → demo login keeps local dev usable.
    if (!realAuth) {
      setIsLoading(true)
      setTimeout(() => { demoLogin(); navigate('/') }, 600)
      return
    }
    setIsLoading(true)
    try {
      if (mode === 'signup') {
        const res = await signUp(email.trim(), password, fullName.trim())
        if (res?.session) { toast.success('Account created!'); navigate('/') }
        else toast.success('Check your email to confirm your account, then sign in.')
      } else {
        await signIn(email.trim(), password)
        toast.success('Welcome back!')
        navigate('/')
      }
    } catch (err) {
      toast.error(err?.message || 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />
        <div className="login-bg-grid" />
      </div>

      <div className="login-container">
        {/* Left — Branding */}
        <div className="login-branding">
          <div className="login-logo">
            <Logo size={44} withWordmark wordmarkSize={38} />
          </div>
          <p className="login-tagline">The world's first AI-powered hiring operating system</p>

          <div className="login-features">
            <div className="login-feature">
              <Sparkles size={18} className="login-feature-icon" />
              <div>
                <strong>AI Interview Engine</strong>
                <span>7-part structured interview with full context</span>
              </div>
            </div>
            <div className="login-feature">
              <Sparkles size={18} className="login-feature-icon" />
              <div>
                <strong>15+ Job Boards</strong>
                <span>One-click multi-platform publishing</span>
              </div>
            </div>
            <div className="login-feature">
              <Sparkles size={18} className="login-feature-icon" />
              <div>
                <strong>AI Shortlisting</strong>
                <span>5-dimension weighted candidate scoring</span>
              </div>
            </div>
          </div>

          <div className="login-stats">
            <div className="login-stat">
              <span className="login-stat-value">60%</span>
              <span className="login-stat-label">Faster Hiring</span>
            </div>
            <div className="login-stat">
              <span className="login-stat-value">89%</span>
              <span className="login-stat-label">AI Accuracy</span>
            </div>
            <div className="login-stat">
              <span className="login-stat-value">240h</span>
              <span className="login-stat-label">Saved / Month</span>
            </div>
          </div>
        </div>

        {/* Right — Login Form */}
        <div className="login-form-card">
          <div className="login-form-header">
            <h2>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
            <p>{realAuth ? (mode === 'signup' ? 'Start hiring with HireOS' : 'Sign in to your account to continue') : 'Demo mode — connect Supabase for real accounts'}</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {realAuth && mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="login-input-wrapper">
                  <User size={16} className="login-input-icon" />
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required />
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="login-input-wrapper">
                <Mail size={16} className="login-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
                <button
                  type="button"
                  className="login-link-btn"
                  onClick={() => email.trim()
                    ? toast.success(`Password reset link sent to ${email}`)
                    : toast.error('Enter your email first')}
                >
                  Forgot password?
                </button>
              </div>
              <div className="login-input-wrapper">
                <Lock size={16} className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`btn btn-primary btn-lg login-submit ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
              style={{ width: '100%', marginTop: 'var(--space-2)' }}
            >
              {isLoading ? (
                <div className="login-spinner" />
              ) : (
                <>
                  {realAuth ? (mode === 'signup' ? 'Create account' : 'Sign In') : 'Enter Demo'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {realAuth && (
            <>
              <div className="login-divider"><span>or</span></div>
              <GoogleSignInButton />
            </>
          )}

          {!realAuth && (
            <>
              <div className="login-divider"><span>Demo Access</span></div>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { demoLogin(); navigate('/') }}>
                <Sparkles size={16} /> Quick Demo Login
              </button>
            </>
          )}

          {realAuth && (
            <p className="login-footer-text">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button type="button" className="login-link-btn" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
                {mode === 'signup' ? 'Sign in' : 'Create one'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

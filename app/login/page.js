'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Heart, Mail, Lock, Eye, EyeOff, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'auth_failed') setError('Authentication failed. Please try again.')
  }, [searchParams])

  const supabase = createClient()

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email for a confirmation link to complete sign-up.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-surface-2)' }}>
      {/* Left branding panel */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between p-12 flex-shrink-0"
        style={{ background: 'var(--color-brand)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Heart size={20} className="text-white" />
          </div>
          <span className="text-white font-700 text-xl tracking-tight">HealthCRM</span>
        </div>

        <div>
          <h1 className="text-4xl font-800 text-white leading-tight mb-4">
            Manage your healthcare practice smarter.
          </h1>
          <p className="text-white/70 text-lg leading-relaxed mb-8">
            Complete CRM for clinics, hospitals, and healthcare teams — track leads, patients, appointments, and billing all in one place.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Lead Pipeline', 'Convert prospects to patients'],
              ['Patient Records', 'Complete medical history'],
              ['Appointment Booking', 'Never miss a slot'],
              ['Billing & Finance', 'Invoice & payment tracking'],
            ].map(([title, desc]) => (
              <div key={title} className="p-4 rounded-xl bg-white/10">
                <p className="text-white font-600 text-sm">{title}</p>
                <p className="text-white/60 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs">© 2025 HealthCRM. Built for healthcare teams.</p>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand)' }}>
              <Heart size={18} className="text-white" />
            </div>
            <span className="font-700 text-lg" style={{ color: 'var(--color-text-primary)' }}>HealthCRM</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-[var(--color-border)] overflow-hidden">
            {/* Mode tabs */}
            <div className="flex border-b border-[var(--color-border)]">
              {[['signin', 'Sign In'], ['signup', 'Create Account']].map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); setMessage('') }}
                  className="flex-1 py-3.5 text-sm font-500 transition-all border-b-2"
                  style={{
                    borderBottomColor: mode === m ? 'var(--color-brand)' : 'transparent',
                    color: mode === m ? 'var(--color-brand)' : 'var(--color-text-muted)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-8">
              <h2 className="text-xl font-700 mb-1" style={{ color: 'var(--color-text-primary)' }}>
                {mode === 'signin' ? 'Welcome back' : 'Get started free'}
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                {mode === 'signin'
                  ? 'Sign in to your HealthCRM account'
                  : 'Create your healthcare CRM account'}
              </p>

              {/* Google */}
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white hover:bg-gray-50 transition-all text-sm font-500 mb-5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.017 17.64 11.71 17.64 9.2z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                {googleLoading ? 'Redirecting...' : 'Continue with Google'}
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>or</span>
                <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Dr. Priya Sharma"
                        required
                        className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none transition-all"
                        style={{ fontFamily: 'var(--font-sans)' }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@clinic.com"
                      required
                      className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none transition-all"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>
                    Password
                    {mode === 'signup' && <span className="ml-1 font-400" style={{ color: 'var(--color-text-muted)' }}>(min 6 characters)</span>}
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none transition-all"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                    >
                      {showPassword
                        ? <EyeOff size={15} style={{ color: 'var(--color-text-muted)' }} />
                        : <Eye size={15} style={{ color: 'var(--color-text-muted)' }} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-2.5 text-sm font-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                  style={{ background: 'var(--color-brand)' }}
                >
                  {loading
                    ? 'Please wait...'
                    : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

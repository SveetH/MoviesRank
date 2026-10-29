import { ArrowLeft, Clapperboard, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register'
  const { user, signIn, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destination = (location.state as { from?: string } | null)?.from ?? '/'
  const [identifier, setIdentifier] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={destination} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (isRegister) await register(identifier.trim(), email.trim(), password)
      else await signIn(identifier.trim(), password)
      navigate(destination, { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please check your details and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-art">
        <div className="auth-orb" />
        <div className="auth-art-copy">
          <h1>Stories are<br />better <span>together</span></h1>
          <p>Find your next favorite. Share the films that moved you. Start a conversation that lasts past the credits.</p>
          <div className="auth-art-stamp"><Clapperboard size={32} strokeWidth={1.5} /><i>THE MOVIE CLUB<br />FOR EVERYONE</i></div>
        </div>
        <div className="auth-footer-note">ANOTHER GOOD STORY STARTS HERE</div>
      </div>

      <section className="auth-form-side">
        <Link to="/" className="auth-back"><ArrowLeft size={16} /> Back to discover</Link>
        <div className="auth-form-wrap">
          <div className="auth-kicker">{isRegister ? 'JOIN THE COMMUNITY' : 'WELCOME BACK'}</div>
          <h2>{isRegister ? 'Make yourself at home.' : 'Good to see you again.'}</h2>
          <p className="auth-intro">{isRegister ? 'Create an account to rate, save, and talk movies.' : 'Sign in to pick up where you left off.'}</p>

          <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
            <label htmlFor="username">{isRegister ? 'Username' : 'Username or email address'}</label>
            <div className="input-with-icon">
              <UserRound size={17} />
              <input id="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" required />
            </div>
            {isRegister && (
              <>
                <label htmlFor="email">Email address</label>
                <div className="input-with-icon">
                  <Mail size={17} />
                  <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
                </div>
              </>
            )}
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <LockKeyhole size={17} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button auth-submit" type="submit" disabled={busy}>
              {busy ? 'One moment...' : isRegister ? 'Create your account' : 'Sign in'}
            </button>
          </form>

          <div className="auth-switch">
            {isRegister ? 'Already part of the club?' : 'New around here?'}{' '}
            <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link>
          </div>
          <div className="auth-safe-note"><LockKeyhole size={13} /> Your account, your ratings, your watchlist.</div>
        </div>
        <div className="auth-side-foot">© 2026 MoviesRank <span>·</span> Made for people who love movies</div>
      </section>
    </main>
  )
}

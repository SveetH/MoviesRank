import { useState } from 'react'
import { CirclePlay, Heart, LogIn, LogOut, Search, UserRound } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [logoutWarning, setLogoutWarning] = useState('')

  async function handleSignOut() {
    navigate('/')
    setLogoutWarning('')
    try {
      await signOut()
    } catch {
      setLogoutWarning('You are signed out in this browser, but the server could not confirm token revocation.')
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="MoviesRank home">
            <span className="brand-mark"><CirclePlay size={20} strokeWidth={1.7} /></span>
            <span>movies<span className="brand-accent">rank</span></span>
          </Link>

          <nav className="main-nav" aria-label="Main navigation">
            <NavLink to="/" end>Discover</NavLink>
            {user && (
              <NavLink to="/liked" className="liked-nav">
                <Heart size={15} /> My list
              </NavLink>
            )}
          </nav>

          <div className="header-actions">
            <Link className="icon-link search-shortcut" to="/#discover" aria-label="Browse movies">
              <Search size={18} />
            </Link>
            {user ? (
              <>
                <span className="user-chip"><UserRound size={15} /> {user.username}</span>
                <button className="header-login" onClick={() => void handleSignOut()}>
                  <LogOut size={15} /> <span>Sign out</span>
                </button>
              </>
            ) : (
              <>
                <Link className="header-login" to="/login">
                  <LogIn size={15} /> <span>Sign in</span>
                </Link>
                <Link className="button button-small" to="/register">Join MoviesRank</Link>
              </>
            )}
          </div>
        </div>
      </header>
      {logoutWarning && (
        <div className="logout-warning" role="alert">
          <span>{logoutWarning}</span>
          <button onClick={() => setLogoutWarning('')} aria-label="Dismiss sign-out warning">×</button>
        </div>
      )}
    </>
  )
}

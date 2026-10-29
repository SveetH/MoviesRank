import { ArrowUpRight, Clapperboard, Video } from 'lucide-react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Header } from './components/Header'
import { AuthPage } from './pages/AuthPage'
import { CatalogPage } from './pages/CatalogPage'
import { LikedMoviesPage } from './pages/LikedMoviesPage'
import { MovieDetailPage } from './pages/MovieDetailPage'

function ProtectedLikedMovies() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  return isAuthenticated ? <LikedMoviesPage /> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

function NotFoundPage() {
  return (
    <main className="not-found">
      <span className="not-found-icon"><Clapperboard size={28} /></span>
      <div className="eyebrow eyebrow-dark"><span className="eyebrow-line" /> CUT TO ANOTHER SCENE</div>
      <h1>This page missed<br />its <span>screening.</span></h1>
      <p>Looks like this story isn’t in our collection.</p>
      <Link to="/" className="button">Back to discover <ArrowUpRight size={16} /></Link>
    </main>
  )
}

export function App() {
  return (
    <div className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/movies/:id" element={<MovieDetailPage />} />
        <Route path="/liked" element={<ProtectedLikedMovies />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <footer className="site-footer">
        <Link className="brand footer-brand" to="/">
          <span className="brand-mark"><Video size={18} strokeWidth={1.7} /></span>
          <span>movies<span className="brand-accent">rank</span></span>
        </Link>
        <span>For the love of a good story.</span>
        <span className="footer-credits">
          Movie data <a href="https://www.wikidata.org/" target="_blank" rel="noreferrer">Wikidata (CC0)</a>
          {' · '}Posters credited to <a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer">Wikimedia Commons</a>
        </span>
        <span>© 2026 MoviesRank</span>
      </footer>
    </div>
  )
}

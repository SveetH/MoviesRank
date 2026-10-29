import { ArrowLeft, Heart } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { MovieGrid } from '../components/MovieGrid'
import { ErrorState, LoadingState } from '../components/States'
import type { Movie, PaginatedResponse } from '../types'

export function LikedMoviesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<PaginatedResponse<Movie> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadMovies = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.getLikedMovies(searchParams)
      setData(response)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please sign in and try again.')
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => { void loadMovies() }, [loadMovies])

  function changePage(url: string | null) {
    if (!url) return
    setSearchParams(new URL(url, window.location.origin).searchParams)
  }

  return (
    <main className="liked-page">
      <div className="liked-title-row">
        <div>
          <Link to="/" className="back-link back-link-dark"><ArrowLeft size={16} /> Discover</Link>
          <div className="eyebrow eyebrow-dark"><span className="eyebrow-line" /> YOUR PERSONAL COLLECTION</div>
          <h1>Movies you <span>love</span></h1>
          <p>All the films you’ve saved in one place.</p>
        </div>
        <div className="liked-mark"><Heart size={31} /></div>
      </div>
      {loading ? <LoadingState label="Finding your favorites" /> : error ? (
        <ErrorState message={error} onRetry={() => void loadMovies()} />
      ) : (
        <>
          <div className="results-caption"><span>{data?.count ?? 0} {(data?.count ?? 0) === 1 ? 'favorite' : 'favorites'}</span></div>
          {data?.results.length ? <MovieGrid movies={data.results} /> : (
            <div className="empty-state liked-empty">
              <span className="empty-icon"><Heart size={25} /></span>
              <h3>Your collection starts here</h3>
              <p>When you like a movie, you’ll find it here. Go discover something good.</p>
              <Link to="/" className="button">Explore movies</Link>
            </div>
          )}
          {data && (data.previous || data.next) && (
            <div className="pagination">
              <button className="button button-outline" disabled={!data.previous || loading} onClick={() => changePage(data.previous)}>
                <ArrowLeft size={16} /> Previous
              </button>
              <span>Showing {data.results.length} of {data.count}</span>
              <button className="button button-outline" disabled={!data.next || loading} onClick={() => changePage(data.next)}>
                Next <ArrowLeft size={16} className="pagination-next-icon" />
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
}

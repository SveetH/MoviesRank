import { ArrowDownWideNarrow, ArrowLeft, ArrowRight, Search, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { MovieGrid } from '../components/MovieGrid'
import { ErrorState, LoadingState } from '../components/States'
import type { Movie, PaginatedResponse } from '../types'

const orderOptions = [
  { value: 'name', label: 'Title A–Z' },
  { value: '-release_date', label: 'Newest releases' },
  { value: '-average_rating', label: 'Top rated' },
  { value: '-likes_count', label: 'Most liked' },
]

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [genre, setGenre] = useState(searchParams.get('genre') ?? '')
  const [ordering, setOrdering] = useState(searchParams.get('ordering') ?? 'name')
  const [data, setData] = useState<PaginatedResponse<Movie> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadMovies = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.listMovies(searchParams)
      setData(result)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => { void loadMovies() }, [loadMovies])

  function applyFilters(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (search.trim()) next.set('search', search.trim())
    if (genre.trim()) next.set('genre', genre.trim())
    if (ordering) next.set('ordering', ordering)
    setSearchParams(next)
  }

  function changePage(url: string | null) {
    if (!url) return
    const query = new URL(url, window.location.origin).searchParams
    setSearchParams(query)
  }

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="eyebrow">YOUR NEXT FAVORITE IS HERE</div>
            <h1>Every movie has a <span>story</span></h1>
            <p>Discover films, rate favorites, and share what you love</p>
          </div>
        </div>
      </section>

      <main className="catalog-section" id="discover">
        <div className="section-heading">
          <div>
            <div className="eyebrow eyebrow-dark"><span className="eyebrow-line" /> THE COLLECTION</div>
            <h2>Find your <span>next watch</span></h2>
          </div>
          <p>Good stories are better when they’re shared.</p>
        </div>

        <form className="filter-bar" onSubmit={applyFilters}>
          <label className="search-field">
            <Search size={18} />
            <span className="sr-only">Search movies</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search a title, a story, a feeling..."
            />
            {search && <button className="clear-search" type="button" onClick={() => setSearch('')} aria-label="Clear search">×</button>}
          </label>
          <label className="genre-field">
            <SlidersHorizontal size={15} />
            <span className="sr-only">Filter by genre</span>
            <input value={genre} onChange={(event) => setGenre(event.target.value)} placeholder="Genre (e.g. action)" />
          </label>
          <label className="sort-field">
            <ArrowDownWideNarrow size={16} />
            <span className="sr-only">Sort movies</span>
            <select value={ordering} onChange={(event) => {
              setOrdering(event.target.value)
              const next = new URLSearchParams(searchParams)
              next.set('ordering', event.target.value)
              setSearchParams(next)
            }}>
              {orderOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button className="button filter-button" type="submit">Search</button>
        </form>

        <div className="results-caption">
          <span>{data ? `${data.count} ${data.count === 1 ? 'movie' : 'movies'} to discover` : 'Browse the collection'}</span>
          <span className="results-dot" /> <span>Always something worth watching</span>
        </div>

        {loading ? <LoadingState /> : error ? (
          <ErrorState message={error} onRetry={() => void loadMovies()} />
        ) : (
          <>
            <MovieGrid movies={data?.results ?? []} />
            {data && (data.previous || data.next) && (
              <div className="pagination">
                <button className="button button-outline" disabled={!data.previous || loading} onClick={() => changePage(data.previous)}>
                  <ArrowLeft size={16} /> Previous
                </button>
                <span>Showing {data.results.length} of {data.count}</span>
                <button className="button button-outline" disabled={!data.next || loading} onClick={() => changePage(data.next)}>
                  Next <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}

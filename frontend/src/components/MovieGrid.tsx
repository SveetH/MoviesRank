import { Film } from 'lucide-react'
import type { Movie } from '../types'
import { MovieCard } from './MovieCard'

export function MovieGrid({ movies }: { movies: Movie[] }) {
  if (movies.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon"><Film size={25} /></span>
        <h3>No movies found</h3>
        <p>Try a different search or adjust your filters.</p>
      </div>
    )
  }

  return (
    <div className="movie-grid">
      {movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}
    </div>
  )
}

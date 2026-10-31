import { ArrowUpRight, Heart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Movie } from '../types'

function posterBackdrop(movie: Movie): string {
  return movie.poster_url
    ? `linear-gradient(180deg, transparent 46%, rgba(12, 12, 15, .55) 100%), url("${movie.poster_url}")`
    : 'linear-gradient(145deg, #34303d, #17171e 60%, #29212c)'
}

export function MovieCard({ movie }: { movie: Movie }) {
  const year = movie.release_date?.slice(0, 4)

  return (
    <article className="movie-card">
      <Link
        className="movie-poster"
        to={`/movies/${movie.id}`}
        style={{ backgroundImage: posterBackdrop(movie) }}
        aria-label={`View ${movie.name}`}
      >
        {!movie.poster_url && (
          <span className="poster-placeholder"><span>MR</span></span>
        )}
        <span className="poster-rating">
          <Star size={14} fill="currentColor" />
          <span>{movie.average_rating ?? '—'}</span>
        </span>
        <span className="poster-open"><ArrowUpRight size={17} /></span>
      </Link>
      {movie.poster_source_url && (
        <a
          className="poster-credit"
          href={movie.poster_source_url}
          target="_blank"
          rel="noreferrer"
          title={`Poster credit: ${movie.poster_attribution}; ${movie.poster_license}`}
        >
          Poster: {movie.poster_attribution || 'Wikimedia Commons'} · {movie.poster_license}
        </a>
      )}

      <div className="movie-card-body">
        <div className="movie-card-meta">
          <span>{year ?? 'Release date TBA'}</span>
          {movie.runtime_minutes && <><i /> <span>{movie.runtime_minutes} min</span></>}
        </div>
        <Link className="movie-card-title" to={`/movies/${movie.id}`}>{movie.name}</Link>
        <div className="movie-card-footer">
          <span className="genre-label">{movie.genres.map((genre) => genre.name).join(', ') || 'Movie'}</span>
          <span className="like-count"><Heart size={14} /> {movie.likes_count}</span>
        </div>
      </div>
    </article>
  )
}

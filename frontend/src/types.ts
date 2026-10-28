export interface Genre {
  id: number
  name: string
  slug: string
}

export interface Movie {
  id: number
  name: string
  description: string
  release_date: string | null
  runtime_minutes: number | null
  poster_url: string
  poster_attribution: string
  poster_license: string
  poster_source_url: string
  wikidata_id: string | null
  data_source_url: string
  genres: Genre[]
  likes_count: number
  average_rating: string | null
  rating_count: number
  created_at: string
  updated_at: string
}

export interface Comment {
  id: number
  movie: number
  user: number
  username: string
  text: string
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface CurrentUser {
  id: number | null
  username: string
}

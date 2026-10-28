import type {
  AuthTokens,
  Comment,
  CurrentUser,
  Movie,
  PaginatedResponse,
} from './types'

const TOKEN_KEY = 'moviesrank.tokens'
const USERNAME_KEY = 'moviesrank.username'
const API_ROOT = '/api'

interface ApiError extends Error {
  status?: number
}

export class AuthenticationExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.')
    this.name = 'AuthenticationExpiredError'
  }
}

export function getTokens(): AuthTokens | null {
  const saved = sessionStorage.getItem(TOKEN_KEY)
  if (!saved) return null

  try {
    const tokens = JSON.parse(saved) as AuthTokens
    return tokens.access && tokens.refresh ? tokens : null
  } catch {
    sessionStorage.removeItem(TOKEN_KEY)
    return null
  }
}

export function saveTokens(tokens: AuthTokens): void {
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

export function saveUsername(username: string): void {
  sessionStorage.setItem(USERNAME_KEY, username)
}

export function clearTokens(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USERNAME_KEY)
}

function getUserFromAccessToken(access: string): CurrentUser {
  try {
    const payload = access.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(normalized)) as {
      user_id?: number
      username?: string
    }
    return {
      id: typeof decoded.user_id === 'number' ? decoded.user_id : null,
      username: decoded.username ?? 'Movie fan',
    }
  } catch {
    return { id: null, username: 'Movie fan' }
  }
}

export function getCurrentUser(): CurrentUser | null {
  const tokens = getTokens()
  if (!tokens) return null
  const user = getUserFromAccessToken(tokens.access)
  return {
    ...user,
    username: user.username === 'Movie fan'
      ? sessionStorage.getItem(USERNAME_KEY) ?? user.username
      : user.username,
  }
}

function getErrorMessage(payload: unknown): string {
  if (typeof payload === 'string') return payload
  if (!payload || typeof payload !== 'object') return 'Something went wrong.'

  const values = Object.values(payload as Record<string, unknown>)
  const messages = values.flatMap((value) => {
    if (typeof value === 'string') return [value]
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
    return []
  })
  return messages[0] ?? 'Please check your details and try again.'
}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getTokens()
  if (!tokens) return null

  try {
    const response = await fetch(`${API_ROOT}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: tokens.refresh }),
    })
    if (!response.ok) {
      clearTokens()
      return null
    }

    const refreshed = (await response.json()) as Partial<AuthTokens>
    if (!refreshed.access) {
      clearTokens()
      return null
    }

    saveTokens({
      access: refreshed.access,
      refresh: refreshed.refresh ?? tokens.refresh,
    })
    return refreshed.access
  } catch {
    return null
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const tokens = getTokens()
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (tokens?.access) headers.set('Authorization', `Bearer ${tokens.access}`)

  const response = await fetch(`${API_ROOT}${path}`, { ...options, headers })
  if (response.status === 401 && retry && tokens) {
    const refreshedAccess = await refreshAccessToken()
    if (refreshedAccess) return request<T>(path, options, false)
    clearTokens()
    window.dispatchEvent(new Event('moviesrank:session-expired'))
    throw new AuthenticationExpiredError()
  }

  if (!response.ok) {
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    const error = new Error(getErrorMessage(payload)) as ApiError
    error.status = response.status
    throw error
  }

  if (response.status === 204 || response.status === 205) return undefined as T
  return (await response.json()) as T
}

export const api = {
  listMovies(params: URLSearchParams = new URLSearchParams()) {
    const query = params.toString()
    return request<PaginatedResponse<Movie>>(`/movies/${query ? `?${query}` : ''}`)
  },

  getMovie(id: number) {
    return request<Movie>(`/movies/${id}/`)
  },

  getLikedMovies(params: URLSearchParams = new URLSearchParams()) {
    const query = params.toString()
    return request<PaginatedResponse<Movie>>(`/movies/liked/${query ? `?${query}` : ''}`)
  },

  getMovieInteraction(movieId: number) {
    return request<{ liked: boolean; rating: number | null }>(`/movies/${movieId}/interaction/`)
  },

  getComments(movieId: number, page = 1) {
    const query = page > 1 ? `?page=${page}` : ''
    return request<PaginatedResponse<Comment>>(`/movies/${movieId}/comments/${query}`)
  },

  createComment(movieId: number, text: string) {
    return request<Comment>(`/movies/${movieId}/comments/`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  },

  deleteComment(commentId: number) {
    return request<void>(`/comments/${commentId}/`, { method: 'DELETE' })
  },

  likeMovie(movieId: number) {
    return request<{ id: number }>(`/movies/${movieId}/like/`, { method: 'POST' })
  },

  unlikeMovie(movieId: number) {
    return request<void>(`/movies/${movieId}/like/`, { method: 'DELETE' })
  },

  rateMovie(movieId: number, value: number) {
    return request<{ value: number }>(`/movies/${movieId}/rating/`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    })
  },

  register(username: string, email: string, password: string) {
    return request<{ id: number; username: string; email: string }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    })
  },

  login(username: string, password: string) {
    return request<AuthTokens>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },

  logout(refresh: string) {
    return request<void>('/auth/logout/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    })
  },
}

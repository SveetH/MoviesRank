import { ArrowLeft, CalendarDays, Check, Clock3, Heart, MessageCircle, Pencil, Send, Star, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../AuthContext'
import type { Comment, Movie, PaginatedResponse } from '../types'

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    .format(new Date(value))
}

export function MovieDetailPage() {
  const { id } = useParams()
  const movieId = Number(id)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [commentData, setCommentData] = useState<PaginatedResponse<Comment> | null>(null)
  const [commentPage, setCommentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const [feedback, setFeedback] = useState('')

  const loadMovie = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [result, commentResult, interaction] = await Promise.all([
        api.getMovie(movieId),
        api.getComments(movieId, commentPage),
        user ? api.getMovieInteraction(movieId) : Promise.resolve(null),
      ])
      setMovie(result)
      setLikeCount(result.likes_count)
      setCommentData(commentResult)
      setLiked(interaction?.liked ?? false)
      setRating(interaction?.rating ?? 0)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }, [commentPage, movieId, user])

  useEffect(() => {
    if (Number.isInteger(movieId) && movieId > 0) void loadMovie()
    else {
      setError('That movie could not be found.')
      setLoading(false)
    }
  }, [loadMovie, movieId])

  function requireSignIn() {
    if (user) return true
    navigate('/login', { state: { from: `/movies/${movieId}` } })
    return false
  }

  async function toggleLike() {
    if (!requireSignIn()) return
    setFeedback('')
    try {
      if (liked) {
        await api.unlikeMovie(movieId)
        setLiked(false)
        setLikeCount((count) => Math.max(0, count - 1))
      } else {
        await api.likeMovie(movieId)
        setLiked(true)
        setLikeCount((count) => count + 1)
      }
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : 'Could not update your like.')
    }
  }

  async function submitRating() {
    if (!requireSignIn() || rating < 1) return
    setFeedback('')
    try {
      await api.rateMovie(movieId, rating)
      setMovie(await api.getMovie(movieId))
      setFeedback(`Your ${rating}-star rating has been saved.`)
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : 'Could not save your rating.')
    }
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault()
    if (!requireSignIn() || !commentText.trim()) return
    setSubmittingComment(true)
    setFeedback('')
    try {
      await api.createComment(movieId, commentText.trim())
      setCommentData(await api.getComments(movieId, 1))
      setCommentPage(1)
      setCommentText('')
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : 'Could not post your comment.')
    } finally {
      setSubmittingComment(false)
    }
  }

  async function deleteComment(commentId: number) {
    try {
      await api.deleteComment(commentId)
      setCommentData((current) => current && ({
        ...current,
        count: Math.max(0, current.count - 1),
        results: current.results.filter((comment) => comment.id !== commentId),
      }))
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : 'Could not delete the comment.')
    }
  }

  async function saveComment(commentId: number) {
    const text = editingCommentText.trim()
    if (!text) return

    setSavingComment(true)
    setFeedback('')
    try {
      const updatedComment = await api.updateComment(commentId, text)
      setCommentData((current) => current && ({
        ...current,
        results: current.results.map((comment) => (
          comment.id === commentId ? updatedComment : comment
        )),
      }))
      setEditingCommentId(null)
      setEditingCommentText('')
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : 'Could not update the comment.')
    } finally {
      setSavingComment(false)
    }
  }

  function startEditingComment(comment: Comment) {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.text)
    setFeedback('')
  }

  function cancelEditingComment() {
    setEditingCommentId(null)
    setEditingCommentText('')
  }

  function changeCommentPage(url: string | null) {
    if (!url) return
    const page = Number(new URL(url, window.location.origin).searchParams.get('page') ?? 1)
    if (Number.isInteger(page) && page > 0) setCommentPage(page)
  }

  if (loading) return <main className="page-wrap"><LoadingState label="Loading movie" /></main>
  if (error || !movie) {
    return <main className="page-wrap"><ErrorState message={error || 'Movie not found.'} onRetry={() => void loadMovie()} /></main>
  }

  const background = movie.poster_url
    ? `linear-gradient(90deg, #101014 0%, rgba(16, 16, 20, .92) 42%, rgba(16, 16, 20, .65) 100%), url("${movie.poster_url}")`
    : 'linear-gradient(110deg, #23212a, #101014 72%)'

  return (
    <main className="detail-page">
      <section className="detail-hero" style={{ backgroundImage: background }}>
        <div className="detail-hero-inner">
          <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to discover</Link>
          <div className="detail-copy">
            <div className="genre-pills">
              {movie.genres.map((genre) => <span key={genre.id}>{genre.name}</span>)}
              {!movie.genres.length && <span>FEATURED FILM</span>}
            </div>
            <h1>{movie.name}</h1>
            <div className="detail-facts">
              {movie.release_date && <span><CalendarDays size={16} /> {new Date(movie.release_date).getFullYear()}</span>}
              {movie.runtime_minutes && <span><Clock3 size={16} /> {movie.runtime_minutes} min</span>}
              <span><Star size={16} fill="currentColor" /> {movie.average_rating ?? 'Not rated'} <small>({movie.rating_count})</small></span>
            </div>
            <p className="detail-description">{movie.description || 'No description has been added for this movie yet.'}</p>
            <div className="detail-credits">
              <span>Movie data: {movie.data_source_url
                ? <a href={movie.data_source_url} target="_blank" rel="noreferrer">Wikidata</a>
                : 'MoviesRank'}</span>
              {movie.poster_source_url && (
                <span>Poster: <a href={movie.poster_source_url} target="_blank" rel="noreferrer">
                  {movie.poster_attribution || 'Wikimedia Commons'} · {movie.poster_license}
                </a></span>
              )}
            </div>
            <div className="detail-actions">
              {user && (
                <button className={`button like-button ${liked ? 'is-liked' : ''}`} onClick={() => void toggleLike()}>
                  <Heart size={17} fill={liked ? 'currentColor' : 'none'} /> {liked ? 'In your liked movies' : 'Add to my likes'}
                </button>
              )}
              <span className="detail-like-count">{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>
            </div>
            {user && (
              <div className="rate-panel">
                <div>
                  <strong>Make it personal</strong>
                  <span>Your rating helps others find their next favorite.</span>
                </div>
                <div className="rating-control" role="group" aria-label="Choose your rating">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      className="star-button"
                      aria-label={`${value} star${value > 1 ? 's' : ''}`}
                      onMouseEnter={() => setHoverRating(value)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(value)}
                    >
                      <Star size={22} fill={(hoverRating || rating) >= value ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                  <button className="rate-submit" disabled={!rating} onClick={() => void submitRating()}>Rate</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="comments-section">
        <div className="comments-heading">
          <div className="eyebrow eyebrow-dark"><span className="eyebrow-line" /> THE CONVERSATION</div>
          <h2>What did you <span>think?</span></h2>
          <p>Good movies spark good conversations.</p>
        </div>
        {feedback && <div className="inline-feedback" role="status">{feedback}</div>}
        <form className="comment-composer" onSubmit={(event) => void submitComment(event)}>
          <div className="comment-avatar">{user?.username.slice(0, 1).toUpperCase() ?? '?'}</div>
          <label className="sr-only" htmlFor="comment-text">Write a comment</label>
          <textarea
            id="comment-text"
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder={user ? 'Share your thoughts about this film...' : 'Sign in to join the conversation...'}
            maxLength={5000}
          />
          <button className="button comment-submit" type="submit" disabled={!commentText.trim() || submittingComment}>
            <Send size={15} /> Post
          </button>
        </form>
        <div className="comment-list-heading">
          <span><MessageCircle size={17} /> {commentData?.count ?? 0} {(commentData?.count ?? 0) === 1 ? 'comment' : 'comments'}</span>
          <span>Latest first</span>
        </div>
        {commentData?.results.length ? (
          <div className="comment-list">
            {commentData.results.map((comment) => (
              <article className="comment-item" key={comment.id}>
                <div className="comment-avatar comment-avatar-muted">{comment.username.slice(0, 1).toUpperCase()}</div>
                <div className="comment-content">
                  <div className="comment-meta"><strong>{comment.username}</strong><time>{formatDate(comment.created_at)}</time></div>
                  {editingCommentId === comment.id ? (
                    <div className="comment-edit-form">
                      <label className="sr-only" htmlFor={`edit-comment-${comment.id}`}>Edit your comment</label>
                      <textarea
                        id={`edit-comment-${comment.id}`}
                        value={editingCommentText}
                        onChange={(event) => setEditingCommentText(event.target.value)}
                        maxLength={5000}
                        autoFocus
                      />
                      <div className="comment-edit-actions">
                        <button
                          className="comment-action"
                          type="button"
                          onClick={() => void saveComment(comment.id)}
                          disabled={!editingCommentText.trim() || savingComment}
                        >
                          <Check size={15} /> Save
                        </button>
                        <button
                          className="comment-action"
                          type="button"
                          onClick={cancelEditingComment}
                          disabled={savingComment}
                        >
                          <X size={15} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p>{comment.text}</p>
                  )}
                </div>
                {comment.is_owner && (
                  <div className="comment-actions">
                    <button
                      className="delete-comment"
                      onClick={() => startEditingComment(comment)}
                      aria-label="Edit your comment"
                      title="Edit comment"
                      hidden={editingCommentId === comment.id}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="delete-comment"
                      onClick={() => void deleteComment(comment.id)}
                      aria-label="Delete your comment"
                      title="Delete comment"
                      hidden={editingCommentId === comment.id}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="no-comments">No comments yet. Be the first to share what you thought.</div>
        )}
        {commentData && (commentData.previous || commentData.next) && (
          <div className="pagination">
            <button className="button button-outline" disabled={!commentData.previous || loading} onClick={() => changeCommentPage(commentData.previous)}>
              <ArrowLeft size={16} /> Previous
            </button>
            <span>Showing {commentData.results.length} of {commentData.count}</span>
            <button className="button button-outline" disabled={!commentData.next || loading} onClick={() => changeCommentPage(commentData.next)}>
              Next <ArrowLeft size={16} className="pagination-next-icon" />
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

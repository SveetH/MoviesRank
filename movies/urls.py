from django.urls import path

from .views import (
    CommentUpdateDeleteView,
    LikedMoviesView,
    MovieCommentListCreateView,
    MovieDetailView,
    MovieInteractionView,
    MovieLikeView,
    MovieListCreateView,
    MovieRatingView,
)

urlpatterns = [
    path('movies/', MovieListCreateView.as_view(), name='movie-list'),
    path('movies/liked/', LikedMoviesView.as_view(), name='liked-movies'),
    path('movies/<int:movie_id>/interaction/', MovieInteractionView.as_view(), name='movie-interaction'),
    path('movies/<int:movie_id>/like/', MovieLikeView.as_view(), name='movie-like'),
    path('movies/<int:movie_id>/rating/', MovieRatingView.as_view(), name='movie-rating'),
    path(
        'movies/<int:movie_id>/comments/',
        MovieCommentListCreateView.as_view(),
        name='movie-comments',
    ),
    path('movies/<int:pk>/', MovieDetailView.as_view(), name='movie-detail'),
    path('comments/<int:pk>/', CommentUpdateDeleteView.as_view(), name='comment-detail'),
]

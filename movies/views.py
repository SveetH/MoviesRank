from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import MovieFilter
from .models import Comment, Like, Movie, Rating
from .permissions import IsCommentOwnerOrMovieManager, IsMovieManager, PublicReadOnly
from .serializers import (
    CommentSerializer,
    LikeSerializer,
    MovieSerializer,
    MovieWriteSerializer,
    RatingSerializer,
    RatingValueSerializer,
)


def movie_queryset():
    return Movie.objects.annotate(
        likes_count=Count('likes', distinct=True),
        rating_count=Count('ratings', distinct=True),
        average_rating=Avg('ratings__value'),
    ).prefetch_related('genres').order_by('name', 'pk')


class MovieListCreateView(generics.ListCreateAPIView):
    filterset_class = MovieFilter
    search_fields = ('name', 'description', 'genres__name')
    ordering_fields = ('name', 'release_date', 'created_at', 'average_rating', 'likes_count')
    ordering = ('name',)

    def get_queryset(self):
        return movie_queryset()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MovieWriteSerializer
        return MovieSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return (AllowAny(),)
        return (IsMovieManager(),)


class MovieDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_queryset(self):
        return movie_queryset()

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return MovieWriteSerializer
        return MovieSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return (AllowAny(),)
        return (IsMovieManager(),)


class LikedMoviesView(generics.ListAPIView):
    serializer_class = MovieSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return movie_queryset().filter(likes__user=self.request.user)


class MovieInteractionView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, movie_id):
        movie = get_object_or_404(Movie, pk=movie_id)
        rating = Rating.objects.filter(user=request.user, movie=movie).first()
        return Response({
            'liked': Like.objects.filter(user=request.user, movie=movie).exists(),
            'rating': rating.value if rating else None,
        })


class MovieLikeView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, movie_id):
        movie = get_object_or_404(Movie, pk=movie_id)
        like, created = Like.objects.get_or_create(user=request.user, movie=movie)
        return Response(
            LikeSerializer(like).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, movie_id):
        movie = get_object_or_404(Movie, pk=movie_id)
        Like.objects.filter(user=request.user, movie=movie).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MovieRatingView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, movie_id):
        return self._save_rating(request, movie_id)

    def put(self, request, movie_id):
        return self._save_rating(request, movie_id)

    def _save_rating(self, request, movie_id):
        movie = get_object_or_404(Movie, pk=movie_id)
        value_serializer = RatingValueSerializer(data=request.data)
        value_serializer.is_valid(raise_exception=True)
        rating, created = Rating.objects.update_or_create(
            user=request.user,
            movie=movie,
            defaults={'value': value_serializer.validated_data['value']},
        )
        return Response(
            RatingSerializer(rating).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, movie_id):
        movie = get_object_or_404(Movie, pk=movie_id)
        Rating.objects.filter(user=request.user, movie=movie).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MovieCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = (PublicReadOnly,)

    def get_queryset(self):
        get_object_or_404(Movie, pk=self.kwargs['movie_id'])
        return Comment.objects.filter(movie_id=self.kwargs['movie_id']).select_related('user')

    def perform_create(self, serializer):
        movie = get_object_or_404(Movie, pk=self.kwargs['movie_id'])
        serializer.save(user=self.request.user, movie=movie)


class CommentDeleteView(generics.DestroyAPIView):
    queryset = Comment.objects.select_related('user')
    serializer_class = CommentSerializer
    permission_classes = (IsCommentOwnerOrMovieManager,)

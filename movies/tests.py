from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Comment, Genre, Like, Movie, Rating

Account = get_user_model()


class MovieApiTests(APITestCase):
    def setUp(self):
        self.user = Account.objects.create_user(
            username='viewer',
            email='viewer@example.com',
            password='test-password-123',
        )
        self.other_user = Account.objects.create_user(
            username='other',
            email='other@example.com',
            password='test-password-123',
        )
        self.manager = Account.objects.create_user(
            username='manager',
            email='manager@example.com',
            password='test-password-123',
        )
        group, _ = Group.objects.get_or_create(name='Movie Managers')
        self.manager.groups.add(group)
        self.movie = Movie.objects.create(name='Example Film', description='A test film')

    def test_movie_browsing_is_public_but_writes_require_movie_manager(self):
        response = self.client.get('/api/movies/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['name'], 'Example Film')

        self.assertEqual(
            self.client.post('/api/movies/', {'name': 'Blocked'}, format='json').status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.client.force_authenticate(self.user)
        self.assertEqual(
            self.client.post('/api/movies/', {'name': 'Blocked'}, format='json').status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.client.force_authenticate(self.manager)
        create_response = self.client.post(
            '/api/movies/',
            {'name': 'Managed Film', 'description': 'Created by manager'},
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        movie_id = create_response.data['id']
        self.assertEqual(
            self.client.patch(
                f'/api/movies/{movie_id}/',
                {'description': 'Updated description'},
                format='json',
            ).status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            self.client.delete(f'/api/movies/{movie_id}/').status_code,
            status.HTTP_204_NO_CONTENT,
        )

    def test_like_unlike_and_liked_movies_are_user_scoped(self):
        like_url = f'/api/movies/{self.movie.pk}/like/'
        self.assertEqual(
            self.client.post(like_url).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post(like_url).status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.client.post(like_url).status_code, status.HTTP_200_OK)
        self.assertEqual(Like.objects.filter(user=self.user, movie=self.movie).count(), 1)

        liked_response = self.client.get('/api/movies/liked/')
        self.assertEqual(liked_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item['id'] for item in liked_response.data['results']],
            [self.movie.pk],
        )

        self.assertEqual(self.client.delete(like_url).status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Like.objects.filter(user=self.user, movie=self.movie).exists())
        self.client.force_authenticate(self.other_user)
        self.assertEqual(self.client.get('/api/movies/liked/').data['results'], [])

    def test_rating_is_unique_per_user_and_average_is_exposed(self):
        rating_url = f'/api/movies/{self.movie.pk}/rating/'
        self.assertEqual(
            self.client.post(rating_url, {'value': 4}, format='json').status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.client.force_authenticate(self.user)
        self.assertEqual(
            self.client.post(rating_url, {'value': 6}, format='json').status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            self.client.post(rating_url, {'value': 4}, format='json').status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(
            self.client.put(rating_url, {'value': 5}, format='json').status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(Rating.objects.filter(user=self.user, movie=self.movie).count(), 1)
        detail = self.client.get(f'/api/movies/{self.movie.pk}/')
        self.assertEqual(detail.data['average_rating'], '5.00')
        self.assertEqual(detail.data['rating_count'], 1)

    def test_movie_interaction_returns_current_users_like_and_rating(self):
        interaction_url = f'/api/movies/{self.movie.pk}/interaction/'
        self.assertEqual(
            self.client.get(interaction_url).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.client.force_authenticate(self.user)
        self.assertEqual(
            self.client.get(interaction_url).data,
            {'liked': False, 'rating': None},
        )
        Like.objects.create(user=self.user, movie=self.movie)
        Rating.objects.create(user=self.user, movie=self.movie, value=4)
        self.assertEqual(
            self.client.get(interaction_url).data,
            {'liked': True, 'rating': 4},
        )

    def test_comments_are_public_to_read_and_only_author_or_manager_can_delete(self):
        comments_url = f'/api/movies/{self.movie.pk}/comments/'
        self.assertEqual(self.client.get(comments_url).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.post(comments_url, {'text': 'Anonymous'}, format='json').status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.client.force_authenticate(self.user)
        response = self.client.post(
            comments_url,
            {'text': 'A thoughtful review'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        comment = Comment.objects.get(pk=response.data['id'])
        self.assertEqual(comment.user, self.user)

        self.client.force_authenticate(self.other_user)
        self.assertEqual(
            self.client.delete(f'/api/comments/{comment.pk}/').status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.client.force_authenticate(self.user)
        self.assertEqual(
            self.client.delete(f'/api/comments/{comment.pk}/').status_code,
            status.HTTP_204_NO_CONTENT,
        )

    def test_search_filter_and_genres(self):
        genre = Genre.objects.create(name='Drama', slug='drama')
        self.movie.genres.add(genre)
        self.assertEqual(
            self.client.get('/api/movies/?search=Example').status_code,
            status.HTTP_200_OK,
        )
        response = self.client.get('/api/movies/?genre=drama')
        self.assertEqual([item['id'] for item in response.data['results']], [self.movie.pk])
        self.assertEqual(
            self.client.get('/api/movies/?release_after=not-a-date').status_code,
            status.HTTP_400_BAD_REQUEST,
        )

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .forms import AccountCreationForm

Account = get_user_model()


class AccountApiTests(APITestCase):
    def test_admin_creation_form_requires_an_email_address(self):
        form = AccountCreationForm(data={
            'username': 'admin-created',
            'email': 'admin-created@example.com',
            'password1': 'long-and-unique-test-password',
            'password2': 'long-and-unique-test-password',
        })
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(form.save().email, 'admin-created@example.com')

    def test_register_login_and_logout_with_refresh_token_blacklisting(self):
        registration = self.client.post(
            '/api/auth/register/',
            {
                'username': 'new-viewer',
                'email': '  New.Viewer@Example.COM ',
                'password': 'long-and-unique-test-password',
            },
            format='json',
        )
        self.assertEqual(registration.status_code, status.HTTP_201_CREATED)
        self.assertEqual(registration.data['email'], 'new.viewer@example.com')
        self.assertFalse('password' in registration.data)

        login = self.client.post(
            '/api/auth/login/',
            {'username': 'new-viewer', 'password': 'long-and-unique-test-password'},
            format='json',
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        refresh_token = login.data['refresh']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        logout = self.client.post(
            '/api/auth/logout/',
            {'refresh': refresh_token},
            format='json',
        )
        self.assertEqual(logout.status_code, status.HTTP_205_RESET_CONTENT)

        refresh = self.client.post(
            '/api/auth/refresh/',
            {'refresh': refresh_token},
            format='json',
        )
        self.assertEqual(refresh.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_registration_rejects_case_insensitive_duplicate_email(self):
        Account.objects.create_user(
            username='existing',
            email='same@example.com',
            password='test-password-123',
        )
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'another',
                'email': 'SAME@EXAMPLE.COM',
                'password': 'long-and-unique-test-password',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_cannot_blacklist_another_accounts_refresh_token(self):
        first_user = Account.objects.create_user(
            username='first-user',
            email='first@example.com',
            password='test-password-123',
        )
        second_user = Account.objects.create_user(
            username='second-user',
            email='second@example.com',
            password='test-password-123',
        )
        first_token = self.client.post(
            '/api/auth/login/',
            {'username': first_user.username, 'password': 'test-password-123'},
            format='json',
        ).data
        second_token = self.client.post(
            '/api/auth/login/',
            {'username': second_user.username, 'password': 'test-password-123'},
            format='json',
        ).data
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {first_token['access']}")

        response = self.client.post(
            '/api/auth/logout/',
            {'refresh': second_token['refresh']},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

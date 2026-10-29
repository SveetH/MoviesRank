from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Account


class UsernameOrEmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        return token

    def validate(self, attrs):
        identifier = attrs.get(self.username_field, '').strip()
        email_username = Account.objects.filter(
            email__iexact=identifier,
        ).values_list('username', flat=True).first()
        if email_username:
            attrs[self.username_field] = email_username
        return super().validate(attrs)


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ('id', 'username', 'email')
        read_only_fields = ('id',)


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = Account
        fields = ('id', 'username', 'email', 'password')
        read_only_fields = ('id',)

    def validate_email(self, value):
        email = value.strip().lower()
        if Account.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return email

    def create(self, validated_data):
        return Account.objects.create_user(**validated_data)

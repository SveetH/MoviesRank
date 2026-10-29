from rest_framework import serializers

from .models import Comment, Genre, Like, Movie, Rating


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ('id', 'name', 'slug')


class MovieSerializer(serializers.ModelSerializer):
    genres = GenreSerializer(many=True, read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    average_rating = serializers.DecimalField(
        max_digits=3,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    rating_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Movie
        fields = (
            'id',
            'name',
            'description',
            'release_date',
            'runtime_minutes',
            'poster_url',
            'poster_attribution',
            'poster_license',
            'poster_source_url',
            'wikidata_id',
            'data_source_url',
            'genres',
            'likes_count',
            'average_rating',
            'rating_count',
            'created_at',
            'updated_at',
        )


class MovieWriteSerializer(serializers.ModelSerializer):
    genres = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Genre.objects.all(),
        required=False,
    )

    class Meta:
        model = Movie
        fields = (
            'id',
            'name',
            'description',
            'release_date',
            'runtime_minutes',
            'poster_url',
            'genres',
        )
        read_only_fields = ('id',)


class CommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ('id', 'movie', 'user', 'username', 'is_owner', 'text', 'created_at', 'updated_at')
        read_only_fields = ('id', 'movie', 'user', 'username', 'created_at', 'updated_at')

    def get_is_owner(self, comment):
        request = self.context.get('request')
        return bool(request and request.user.is_authenticated and request.user.pk == comment.user_id)


class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ('id', 'movie', 'user', 'value', 'created_at', 'updated_at')
        read_only_fields = ('id', 'movie', 'user', 'created_at', 'updated_at')


class RatingValueSerializer(serializers.Serializer):
    value = serializers.IntegerField(min_value=1, max_value=5)


class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ('id', 'movie', 'user', 'created_at')
        read_only_fields = fields

from django.db import migrations
from django.db.models import Q
from django.utils.text import slugify


def simplify_genres(apps, schema_editor):
    Genre = apps.get_model('movies', 'Genre')
    MovieGenre = apps.get_model('movies', 'Movie_genres')
    database = schema_editor.connection.alias

    for genre in Genre.objects.using(database).order_by('pk').iterator():
        name = genre.name.strip()
        if not name.lower().endswith(' film'):
            continue

        simplified_name = name[:-5].strip()
        simplified_slug = slugify(simplified_name)
        existing = Genre.objects.using(database).filter(
            Q(slug=simplified_slug) | Q(name__iexact=simplified_name)
        ).exclude(pk=genre.pk).first()

        if existing:
            movie_ids = MovieGenre.objects.using(database).filter(
                genre_id=genre.pk,
            ).values_list('movie_id', flat=True)
            for movie_id in movie_ids:
                MovieGenre.objects.using(database).get_or_create(
                    movie_id=movie_id,
                    genre_id=existing.pk,
                )
            Genre.objects.using(database).filter(pk=genre.pk).delete()
        else:
            Genre.objects.using(database).filter(pk=genre.pk).update(
                name=simplified_name,
                slug=simplified_slug,
            )


class Migration(migrations.Migration):

    dependencies = [
        ('movies', '0002_movie_data_source_url_movie_poster_attribution_and_more'),
    ]

    operations = [
        migrations.RunPython(simplify_genres, migrations.RunPython.noop),
    ]

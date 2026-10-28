import json
from datetime import date
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from movies.models import Genre, Movie


FIXTURE_PATH = Path(__file__).resolve().parents[2] / 'fixtures' / 'wikimedia_movies.json'
ALLOWED_LICENSES = ('Public domain', 'CC0', 'CC BY', 'CC BY-SA')


class Command(BaseCommand):
    help = 'Import the 30 credited movie records and posters from the Wikidata/Commons fixture.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Validate the fixture without changing the database.',
        )

    def handle(self, *args, **options):
        try:
            with FIXTURE_PATH.open(encoding='utf-8') as fixture_file:
                records = json.load(fixture_file)
        except (OSError, json.JSONDecodeError) as exc:
            raise CommandError(f'Could not read the Wikimedia movie fixture: {exc}') from exc

        if len(records) != 30:
            raise CommandError(f'Expected exactly 30 movie records; found {len(records)}.')

        names = set()
        wikidata_ids = set()
        for record in records:
            self.validate_record(record, names, wikidata_ids)

        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS('Validated all 30 records; database unchanged.'))
            return

        created_count = 0
        updated_count = 0
        with transaction.atomic():
            for record in records:
                genres = [
                    self.get_or_create_genre(name)
                    for name in record['genres']
                ]
                movie, created = Movie.objects.update_or_create(
                    wikidata_id=record['wikidata_id'],
                    defaults={
                        'name': record['name'],
                        'description': record['description'],
                        'release_date': date.fromisoformat(record['release_date']),
                        'runtime_minutes': record['runtime_minutes'],
                        'poster_url': record['poster_url'],
                        'poster_attribution': record['poster_attribution'],
                        'poster_license': record['poster_license'],
                        'poster_source_url': record['poster_source_url'],
                        'data_source_url': record['data_source_url'],
                    },
                )
                movie.genres.set(genres)
                if created:
                    created_count += 1
                else:
                    updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Imported 30 Wikimedia-sourced movies: '
                f'{created_count} created, {updated_count} updated.'
            )
        )

    def validate_record(self, record, names, wikidata_ids):
        required_fields = (
            'wikidata_id',
            'name',
            'release_date',
            'description',
            'runtime_minutes',
            'genres',
            'data_source_url',
            'poster_url',
            'poster_attribution',
            'poster_license',
            'poster_source_url',
        )
        missing = [field for field in required_fields if not record.get(field)]
        if missing:
            raise CommandError(
                f"Movie record is missing {', '.join(missing)}: {record.get('name', 'unknown')}"
            )

        if record['name'] in names:
            raise CommandError(f"Duplicate movie name in fixture: {record['name']}")
        if record['wikidata_id'] in wikidata_ids:
            raise CommandError(f"Duplicate Wikidata ID in fixture: {record['wikidata_id']}")
        if not record['wikidata_id'].startswith('Q'):
            raise CommandError(f"Invalid Wikidata ID: {record['wikidata_id']}")
        if not record['poster_source_url'].startswith('https://commons.wikimedia.org/wiki/File:'):
            raise CommandError(f"Poster source must link to Wikimedia Commons: {record['name']}")
        if not record['data_source_url'].startswith('https://www.wikidata.org/wiki/'):
            raise CommandError(f"Movie source must link to Wikidata: {record['name']}")
        if not record['poster_url'].startswith('https://'):
            raise CommandError(f"Poster URL must use HTTPS: {record['name']}")
        if not record['poster_license'].startswith(ALLOWED_LICENSES):
            raise CommandError(
                f"Unrecognized free-content license for {record['name']}: "
                f"{record['poster_license']}"
            )

        try:
            date.fromisoformat(record['release_date'])
            if not isinstance(record['runtime_minutes'], int) or record['runtime_minutes'] < 1:
                raise ValueError('runtime must be a positive integer')
        except ValueError as exc:
            raise CommandError(f'Invalid movie facts for {record["name"]}: {exc}') from exc

        if not isinstance(record['genres'], list) or not record['genres']:
            raise CommandError(f"Expected at least one genre for {record['name']}")

        names.add(record['name'])
        wikidata_ids.add(record['wikidata_id'])

    @staticmethod
    def get_or_create_genre(name):
        name = name.strip()
        if name.lower().endswith(' film'):
            name = name[:-5].strip()
        genre, created = Genre.objects.get_or_create(
            name=name,
            defaults={'slug': slugify(name)},
        )
        if not genre.slug:
            genre.slug = slugify(name)
            genre.save(update_fields=('slug',))
        return genre

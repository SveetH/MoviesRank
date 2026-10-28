import django_filters

from .models import Movie


class MovieFilter(django_filters.FilterSet):
    genre = django_filters.CharFilter(field_name='genres__slug', lookup_expr='iexact')
    release_after = django_filters.DateFilter(field_name='release_date', lookup_expr='gte')
    release_before = django_filters.DateFilter(field_name='release_date', lookup_expr='lte')

    class Meta:
        model = Movie
        fields = ()

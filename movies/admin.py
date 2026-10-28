from django.contrib import admin

from .models import Comment, Genre, Like, Movie, Rating


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ('name', 'release_date', 'runtime_minutes', 'created_at')
    list_filter = ('genres', 'release_date')
    search_fields = ('name', 'description')
    filter_horizontal = ('genres',)


admin.site.register(Genre)
admin.site.register(Like)
admin.site.register(Rating)
admin.site.register(Comment)

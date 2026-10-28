from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsMovieManager(BasePermission):
    message = 'You must be a movie manager to modify movie records.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                user.is_staff
                or user.is_superuser
                or user.groups.filter(name='Movie Managers').exists()
            )
        )


class IsCommentOwnerOrMovieManager(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        return bool(
            obj.user_id == user.id
            or user.is_staff
            or user.is_superuser
            or user.groups.filter(name='Movie Managers').exists()
        )


class PublicReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or bool(
            request.user and request.user.is_authenticated
        )

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .forms import AccountCreationForm
from .models import Account


@admin.register(Account)
class AccountAdmin(UserAdmin):
    add_form = AccountCreationForm
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Contact', {'fields': ('email',)}),
    )
    list_display = ('username', 'email', 'is_staff', 'is_active')

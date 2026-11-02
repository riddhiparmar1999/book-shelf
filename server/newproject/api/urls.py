from django.urls import path
from .views import get_books, create_book, book_details, get_book_filters, public_books, register, login, logout, create_role, get_roles, role_details, get_modules, create_user, get_users, user_details, test_email, forgot_password, reset_password, dashboard, get_profile

urlpatterns = [
    path('books/', get_books, name='get_books'),
    path('books/create/', create_book, name='create_books'),
    path('books/<int:pk>', book_details, name="book_details"),
    path("book-filters/", get_book_filters),
    path("public/books/", public_books, name="public_books"),
    path('register/', register, name='register'),
    path('login/', login, name='login'),
    path("logout/", logout, name='logout'),
    path("roles/create/", create_role, name='create_role'),
    path("roles/", get_roles, name='get_roles'),
    path("roles/<int:pk>", role_details, name="role_details"),
    path("modules/", get_modules, name='get_modules'),
    path("users/create/", create_user, name='create_user'),
    path("users/", get_users, name='get_users'),
    path("users/<int:pk>", user_details, name="user_details"),
    path("test-email/", test_email, name='test_email'),
    path("forgot-password/", forgot_password, name='forgot_password'),
    path("reset-password/", reset_password, name='reset_password'),
    path("dashboard/", dashboard, name='dashboard'),
    path("profile/", get_profile, name='get_profile'),
]

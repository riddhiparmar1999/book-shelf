import os
import uuid

from django.db import models
from django.contrib.auth.models import User


def book_cover_upload_to(instance, filename):
    """Store covers under book_covers/ with a unique UUID filename."""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        ext = ".jpg"
    return f"book_covers/{uuid.uuid4().hex}{ext}"


# Create your models here.
class Book(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="books"
    )
    title = models.CharField(max_length=50)
    releaseYear = models.IntegerField()
    author = models.CharField(max_length=50)
    genre = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    cover_image = models.ImageField(
        upload_to=book_cover_upload_to,
        null=True,
        blank=True
    )

    def delete(self, *args, **kwargs):
        if self.cover_image:
            self.cover_image.delete(save=False)
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.title

class Role(models.Model):
    role_name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.role_name

class Module(models.Model):
    module_name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.module_name

class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    module = models.ForeignKey(Module, on_delete=models.CASCADE)

    can_create = models.BooleanField(default=False)
    can_read = models.BooleanField(default=False)
    can_update = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.role.role_name} - {self.module.module_name}"


class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile"
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_users"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - {self.role.role_name if self.role else 'No Role'}"

class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.UUIDField(
        unique=True,
        editable=False
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.token}"
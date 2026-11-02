import os

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Book, Role, Module, RolePermission, UserProfile
from django.contrib.auth import authenticate

ALLOWED_COVER_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_COVER_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = '__all__'
        read_only_fields = ["user"]

    def validate_title(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError(
                "Title must be at least 3 characters long."
            )
        return value

    def validate_author(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError(
                "Author name must be at least 3 characters."
            )
        return value

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Price must be greater than 0."
            )
        return value

    def validate_releaseYear(self, value):
        if value < 1900 or value > 2100:
            raise serializers.ValidationError(
                "Enter a valid release year."
            )
        return value

    def validate_cover_image(self, value):
        if not value:
            return value

        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ALLOWED_COVER_EXTENSIONS:
            raise serializers.ValidationError(
                "Only .jpg, .jpeg, .png, and .webp images are allowed."
            )

        content_type = getattr(value, "content_type", "") or ""
        if content_type and content_type not in ALLOWED_COVER_CONTENT_TYPES:
            raise serializers.ValidationError(
                "Invalid image type. Use JPG, PNG, or WEBP."
            )

        if value.size > MAX_COVER_SIZE_BYTES:
            raise serializers.ValidationError(
                "Cover image must be 5 MB or smaller."
            )

        return value

    def update(self, instance, validated_data):
        new_cover = validated_data.get("cover_image")
        if new_cover is not None and instance.cover_image:
            instance.cover_image.delete(save=False)
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if instance.cover_image:
            url = instance.cover_image.url
            if request is not None:
                data["cover_image"] = request.build_absolute_uri(url)
            else:
                data["cover_image"] = url
        return data


class PublicBookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = [
            "id",
            "title",
            "author",
            "genre",
            "price",
            "description",
            "releaseYear",
            "cover_image",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if instance.cover_image:
            url = instance.cover_image.url
            if request is not None:
                data["cover_image"] = request.build_absolute_uri(url)
            else:
                data["cover_image"] = url
        else:
            data["cover_image"] = None
        return data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'password']

    def validate_first_name(self, value):
        value = value.strip()
        if len(value) < 1:
            raise serializers.ValidationError("First name is required.")
        return value

    def validate_last_name(self, value):
        value = value.strip()
        if len(value) < 1:
            raise serializers.ValidationError("Last name is required.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "Email already exists."
            )
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(
                "Email already exists."
            )
        return value

    def create(self, validated_data):
        email = validated_data["email"]
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class RolePermissionSerializer(serializers.ModelSerializer):
    module_id = serializers.IntegerField(source="module.id", read_only=True)
    module_name = serializers.CharField(source="module.module_name", read_only=True)

    class Meta:
        model = RolePermission
        fields = [
            "module_id",
            "module_name",
            "can_create",
            "can_read",
            "can_update",
            "can_delete",
        ]

class RoleSerializer(serializers.ModelSerializer):
    permissions = RolePermissionSerializer(
        source="rolepermission_set",
        many=True,
        read_only=True,
    )

    class Meta:
        model = Role
        fields = [
            "id",
            "role_name",
            "description",
            "created_at",
            "updated_at",
            "permissions",
        ]

    def validate_role_name(self, value):
        value = value.strip()

        if len(value) < 2:
            raise serializers.ValidationError(
                "Role name must be at least 2 characters."
            )

        return value

    def validate_description(self, value):
        if value is None:
            return value
        return value.strip()

class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = '__all__'

class AssignRoleSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    role_id = serializers.IntegerField()

class CreateUserSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    role_id = serializers.IntegerField()
    is_active = serializers.BooleanField(required=False, default=True)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "Email already exists."
            )
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(
                "Email already exists."
            )
        return value

    def validate_role_id(self, value):
        if not Role.objects.filter(id=value).exists():
            raise serializers.ValidationError(
                "Role not found."
            )
        return value


class UpdateUserSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        min_length=6,
        required=False,
        allow_blank=True,
    )
    role_id = serializers.IntegerField()
    is_active = serializers.BooleanField(required=False, default=True)

    def validate_email(self, value):
        value = value.strip().lower()
        user = self.context.get("user")
        email_qs = User.objects.filter(email__iexact=value)
        username_qs = User.objects.filter(username__iexact=value)
        if user is not None:
            email_qs = email_qs.exclude(pk=user.pk)
            username_qs = username_qs.exclude(pk=user.pk)
        if email_qs.exists() or username_qs.exists():
            raise serializers.ValidationError("Email already exists.")
        return value

    def validate_role_id(self, value):
        if not Role.objects.filter(id=value).exists():
            raise serializers.ValidationError("Role not found.")
        return value


class UserProfileSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(source="id", read_only=True)
    email = serializers.EmailField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    role_id = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)


    def _profile(self, obj):
        try:
            return obj.profile
        except UserProfile.DoesNotExist:
            return None

    def get_role_id(self, obj):
        profile = self._profile(obj)
        if not profile or not profile.role_id:
            return None
        return profile.role_id

    def get_role_name(self, obj):
        profile = self._profile(obj)
        if not profile or not profile.role:
            return None
        return profile.role.role_name

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.strip().lower()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.UUIDField(required=True)
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, min_length=6)

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs

class ProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    role_id = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()

    def _profile(self, obj):
        try:
            return obj.profile
        except UserProfile.DoesNotExist:
            return None

    def get_role_id(self, obj):
        profile = self._profile(obj)
        if not profile or not profile.role_id:
            return None
        return profile.role_id

    def get_role_name(self, obj):
        profile = self._profile(obj)
        if profile and profile.role:
            return profile.role.role_name
        # createsuperuser accounts often have no UserProfile/role row
        if getattr(obj, "is_superuser", False):
            return "Super Admin"
        return None


class UpdateProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        min_length=6,
        required=False,
        allow_blank=True,
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )

    def validate_email(self, value):
        value = value.strip().lower()
        user = self.context.get("user")
        email_qs = User.objects.filter(email__iexact=value)
        username_qs = User.objects.filter(username__iexact=value)
        if user is not None:
            email_qs = email_qs.exclude(pk=user.pk)
            username_qs = username_qs.exclude(pk=user.pk)
        if email_qs.exists() or username_qs.exists():
            raise serializers.ValidationError("Email already exists.")
        return value

    def validate(self, attrs):
        password = attrs.get("password") or ""
        confirm_password = attrs.get("confirm_password") or ""
        if password or confirm_password:
            if not password:
                raise serializers.ValidationError(
                    {"password": "Password is required."}
                )
            if password != confirm_password:
                raise serializers.ValidationError(
                    {"confirm_password": "Passwords do not match."}
                )
        return attrs

class ChangeUserStatusSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    is_active = serializers.BooleanField()
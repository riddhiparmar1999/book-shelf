from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import Book, Role, Module, RolePermission, UserProfile, PasswordResetToken
from .serializer import BookSerializer, PublicBookSerializer, RegisterSerializer, LoginSerializer, RoleSerializer, ModuleSerializer, CreateUserSerializer, UpdateUserSerializer, UserProfileSerializer, ForgotPasswordSerializer, ResetPasswordSerializer, ProfileSerializer, UpdateProfileSerializer, ChangeUserStatusSerializer
from math import ceil
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid
from django.core.cache import cache


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_books(request):
    page = int(request.data.get("page", 1))
    page_size = int(request.data.get("page_size", 5))
    title = request.data.get("title")
    authors = request.data.get("authors", [])
    genres = request.data.get("genres", [])
    min_price = request.data.get("minPrice")
    max_price = request.data.get("maxPrice")
    year = request.data.get("year")

    queryset = Book.objects.filter(user=request.user).order_by("-id")

    if title:
        queryset = queryset.filter(title__icontains=title)

    if authors:
        queryset = queryset.filter(author__in=authors)

    if genres:
        queryset = queryset.filter(genre__in=genres)

    if min_price:
        queryset = queryset.filter(price__gte=min_price)

    if max_price:
        queryset = queryset.filter(price__lte=max_price)

    if year:
        queryset = queryset.filter(releaseYear=year)

    total_records = queryset.count()


    if total_records == 0:
        return Response({
            "success": True,
            "message": "No books found.",
            "data": [],
            "pagination": {
                "current_page": page,
                "page_size": page_size,
                "total_records": 0,
                "total_pages": 0,
                "has_next": False,
                "has_previous": False
            }
        })

    start = (page - 1) * page_size
    end = start + page_size

    books = queryset[start:end]

    serializer = BookSerializer(
        books,
        many=True,
        context={"request": request},
    )

    total_pages = ceil(total_records / page_size)

    return Response({
        "success": True,
        "message": "Books retrieved successfully.",
        "data": serializer.data,
        "pagination": {
            "current_page": page,
            "page_size": page_size,
            "total_records": total_records,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1
        }
    })

@api_view(["GET"])
@permission_classes([AllowAny])
def public_books(request):
    """Public catalog of books for the marketing website (no auth)."""
    try:
        page = max(int(request.query_params.get("page", 1)), 1)
    except (TypeError, ValueError):
        page = 1

    try:
        page_size = min(max(int(request.query_params.get("page_size", 12)), 1), 50)
    except (TypeError, ValueError):
        page_size = 12

    queryset = Book.objects.all().order_by("-id")
    total_records = queryset.count()

    if total_records == 0:
        return Response({
            "success": True,
            "message": "No books found.",
            "data": [],
            "pagination": {
                "current_page": page,
                "page_size": page_size,
                "total_records": 0,
                "total_pages": 0,
                "has_next": False,
                "has_previous": False,
            },
        })

    start = (page - 1) * page_size
    end = start + page_size
    books = queryset[start:end]
    serializer = PublicBookSerializer(
        books,
        many=True,
        context={"request": request},
    )
    total_pages = ceil(total_records / page_size)

    return Response({
        "success": True,
        "message": "Books retrieved successfully.",
        "data": serializer.data,
        "pagination": {
            "current_page": page,
            "page_size": page_size,
            "total_records": total_records,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        },
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_book(request):
    serializedData = BookSerializer(
        data=request.data,
        context={"request": request},
    )
    if serializedData.is_valid():
        serializedData.save(user=request.user)
        return Response(
            {
                "success": True,
                "message": "Book created successfully.",
                "data": serializedData.data,
            }
        )
    return Response(serializedData.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def book_details(request, pk):
    try:
        book = Book.objects.get(pk=pk,user=request.user)
    except Book.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Book not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == 'GET':
        serializer = BookSerializer(book, context={"request": request})
        return Response({
            "success": True,
            "message": "Book retrieved successfully.",
            "data": serializer.data,
        })

    if request.method == 'DELETE':
        book.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # partial=True keeps the existing cover when no new file is sent
    serialized_data = BookSerializer(
        book,
        data=request.data,
        partial=True,
        context={"request": request},
    )
    if serialized_data.is_valid():
        serialized_data.save()
        return Response({
            "success": True,
            "message": "Book updated successfully.",
            "data": serialized_data.data,
        })
    return Response(serialized_data.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_book_filters(request):
    authors = Book.objects.filter(user=request.user).values_list(
        'author',
        flat=True
    ).distinct().order_by('author')
    genres = Book.objects.filter(user=request.user).values_list(
        'genre',
        flat=True
    ).distinct().order_by('genre')
    author_list = [
        {
            "label": author,
            "value": author
        }
        for author in authors
    ]
    genre_list = [
        {
            "label": genre,
            "value": genre
        }
        for genre in genres
    ]
    return Response({
        "success": True,
        "message": "Book filters retrieved successfully.",
        "data": {
            "authors": author_list,
            "genres": genre_list
        }
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(
            {
                "success": True,
                "message": "User registered successfully.",
                "data": serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    return Response(
        {
            "success": False,
            "errors": serializer.errors
        },
        status=status.HTTP_400_BAD_REQUEST
     )

@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    email = serializer.validated_data["email"].strip().lower()
    password = serializer.validated_data["password"]

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Invalid email or password.",
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {
                "success": False,
                "message": "Your account is inactive. Please contact the administrator.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    user = authenticate(
        username=user.username,
        password=password,
    )

    if user is None:
        return Response(
            {
                "success": False,
                "message": "Invalid email or password.",
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    refresh = RefreshToken.for_user(user)

    cache_key = f"user_{user.id}"
    cached_user = cache.get(cache_key)

    if cached_user is not None:
        print("Fetched from Redis")
        user_data = cached_user
    else:
        print("Fetched from PostgreSQL")
        user_data = UserProfileSerializer(user).data
        cache.set(cache_key, user_data, timeout=600)

    return Response(
        {
            "success": True,
            "message": "Login successful.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user_data,
        }
    )

@api_view(["POST"])
def logout(request):
    try:
        refresh_token = request.data.get("refresh_token")
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response(
            {
                "success": True,
                "message": "Logout successful."
            }
        )
    except Exception:
        return Response(
            {
                "success": False,
                "message": "Invalid refresh token."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_role(request):
    permissions = request.data.get("permissions", [])
    serializer = RoleSerializer(data=request.data)
    if serializer.is_valid():
        role = serializer.save()
        for permission in permissions:
            RolePermission.objects.create(
               role=role,
                module=Module.objects.get(id=permission["module_id"]),
                can_create=permission.get("can_create", False),
                can_read=permission.get("can_read", False),
                can_update=permission.get("can_update", False),
                can_delete=permission.get("can_delete", False)
            )
        return Response(
            {
                "success": True,
                "message": "Role created successfully.",
                "data": RoleSerializer(role).data
            },
            status=status.HTTP_201_CREATED
        )
    return Response(
        {
            "success": False,
            "errors": serializer.errors
        },
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_roles(request):
    page = int(request.data.get("page", 1))
    page_size = int(request.data.get("page_size", 5))

    queryset = Role.objects.all().order_by("-id")
    total_records = queryset.count()

    if total_records == 0:
        return Response({
            "success": True,
            "message": "No roles found.",
            "data": [],
            "pagination": {
                "current_page": page,
                "page_size": page_size,
                "total_records": 0,
                "total_pages": 0,
                "has_next": False,
                "has_previous": False
            }
        })

    start = (page - 1) * page_size
    end = start + page_size

    roles = queryset[start:end]
    serializer = RoleSerializer(roles, many=True)
    total_pages = ceil(total_records / page_size)

    return Response(
        {
            "success": True,
            "message": "Roles retrieved successfully.",
            "data": serializer.data,
            "pagination": {
                "current_page": page,
                "page_size": page_size,
                "total_records": total_records,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            }
        }
    )

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def role_details(request, pk):
    try:
        role = Role.objects.get(pk=pk)
        
    except Role.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Role not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == 'GET':
        serializer = RoleSerializer(role)
        return Response({
            "success": True,
            "message": "Role retrieved successfully.",
            "data": serializer.data,
        })

    if request.method == 'DELETE':
        if UserProfile.objects.filter(role=role).exists():
            return Response(
                {
                    "success": False,
                    "message": "Role is assigned to users. Please reassign them before deleting.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        role.delete()
        return Response({
            "success": True,
            "message": "Role deleted successfully.",
        })

    permissions = request.data.get("permissions", [])
    serializer = RoleSerializer(role, data=request.data)
    if serializer.is_valid():
        serializer.save()
        RolePermission.objects.filter(role=role).delete()
        for permission in permissions:
            RolePermission.objects.create(
                role=role,
                module=Module.objects.get(id=permission["module_id"]),
                can_create=permission.get("can_create", False),
                can_read=permission.get("can_read", False),
                can_update=permission.get("can_update", False),
                can_delete=permission.get("can_delete", False),
            )
        return Response({
            "success": True,
            "message": "Role updated successfully.",
            "data": RoleSerializer(role).data,
        })
    return Response(
        {
            "success": False,
            "errors": serializer.errors
        },
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_user(request):
    serializer = CreateUserSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    data = serializer.validated_data

    try:
        role = Role.objects.get(id=data["role_id"])
    except Role.DoesNotExist:
        return Response(
            {
                "success": False,
                "errors": "Role not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )
    
    user = User.objects.create_user(
        username=data["email"],
        email=data["email"],
        password=data["password"],
        first_name=data["first_name"],
        last_name=data["last_name"],
        is_active=data["is_active"],
    )
    
    UserProfile.objects.create(
        user=user,
        role=role,
        created_by=request.user
    )
   
    return Response(
            {
            "success": True,
            "message": "User created successfully.",
            "data": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "role": role.role_name,
                "is_active": user.is_active,
            },
        },
        status=status.HTTP_201_CREATED
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_users(request):
    page = int(request.data.get("page", 1))
    page_size = int(request.data.get("page_size", 5))

    queryset = (
        User.objects.all()
        .select_related("profile", "profile__role")
        .order_by("-id")
    )
    total_records = queryset.count()

    if total_records == 0:
        return Response({
            "success": True,
            "message": "No users found.",
            "data": [],
            "pagination": {
                "current_page": page,
                "page_size": page_size,
                "total_records": 0,
                "total_pages": 0,
                "has_next": False,
                "has_previous": False,
            },
        })

    start = (page - 1) * page_size
    end = start + page_size
    users = queryset[start:end]
    serializer = UserProfileSerializer(users, many=True)
    total_pages = ceil(total_records / page_size)

    return Response({
        "success": True,
        "message": "Users retrieved successfully.",
        "data": serializer.data,
        "pagination": {
            "current_page": page,
            "page_size": page_size,
            "total_records": total_records,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        },
    })


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def user_details(request, pk):
    try:
        user = User.objects.select_related("profile", "profile__role").get(
            pk=pk
        )
    except User.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "User not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        serializer = UserProfileSerializer(user)
        return Response({
            "success": True,
            "message": "User retrieved successfully.",
            "data": serializer.data,
        })

    if request.method == "DELETE":
        if request.user.id == user.id:
            return Response(
                {
                    "success": False,
                    "message": "You cannot delete your own account.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.delete()
        return Response({
            "success": True,
            "message": "User deleted successfully.",
        })

    serializer = UpdateUserSerializer(
        data=request.data,
        context={"user": user},
    )
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data
    role = Role.objects.get(id=data["role_id"])

    user.first_name = data["first_name"]
    user.last_name = data["last_name"]
    user.email = data["email"]
    user.username = data["email"]
    user.is_active = data["is_active"]
    password = data.get("password") or ""
    if password:
        user.set_password(password)
    user.save()

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = role
    profile.save()

    return Response({
        "success": True,
        "message": "User updated successfully.",
        "data": UserProfileSerializer(user).data,
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_modules(request):
    if request.user.is_superuser:
        modules = [
            {
                "module_id": module.id,
                "module_name": module.module_name,
                "permissions": {
                    "create": True,
                    "read": True,
                    "update": True,
                    "delete": True,
                },
            }
            for module in Module.objects.all().order_by("id")
        ]
        return Response({
            "success": True,
            "message": "Modules retrieved successfully.",
            "data": modules,
        })

    try:
        profile = UserProfile.objects.get(user=request.user)
    except UserProfile.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "User profile not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    if profile.role is None:
        return Response({
            "success": True,
            "message": "No role assigned.",
            "data": [],
        })

    permissions = (
        RolePermission.objects
        .filter(role=profile.role)
        .select_related("module")
        .order_by("module_id")
    )

    modules = []
    for permission in permissions:
        # Sidebar + FE gating only include modules the role can at least read.
        if not permission.can_read:
            continue

        modules.append({
            "module_id": permission.module.id,
            "module_name": permission.module.module_name,
            "permissions": {
                "create": permission.can_create,
                "read": permission.can_read,
                "update": permission.can_update,
                "delete": permission.can_delete,
            },
        })

    return Response({
        "success": True,
        "message": "Modules retrieved successfully.",
        "data": modules,
    })

@api_view(["GET"])
def test_email(request):
    send_mail(
        subject="Testing Django Email",
        message="Congratulations! Your SMTP configuration is working.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=["riddhi.parmar@brainvire.com"],
        fail_silently=False,
    )
    return Response({
        "success": True,
        "message": "Email sent successfully."
    })

@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    serializer = ForgotPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    email = serializer.validated_data["email"]

    # Match email or username (createsuperuser / older accounts may differ).
    user = (
        User.objects.filter(email__iexact=email).first()
        or User.objects.filter(username__iexact=email).first()
    )

    if user is None:
        print(f"[forgot_password] no matching user for email={email!r}")
        return Response(
            {
                "success": True,
                "message": "If an account exists with this email, a password reset link has been sent."
            },
            status=status.HTTP_200_OK
        )

    if not user.is_active:
        return Response(
            {
                "success": False,
                "message": "User is not active."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    token = str(uuid.uuid4())
    PasswordResetToken.objects.filter(user=user).delete()
    PasswordResetToken.objects.create(
        user=user,
        token=token,
    )
    print(
        f"[forgot_password] token created for user_id={user.id} "
        f"email={user.email!r} username={user.username!r}"
    )

    reset_link = f"http://localhost:5173/reset-password?token={token}"

    try:
        send_mail(
            subject="Reset Your Password",
            message=f"""
        Hello {user.first_name},

        We received a request to reset your password.

        Click the link below to reset your password:

        {reset_link}

        If you did not request this, please ignore this email.

        Thanks,
        Book Management Team
        """,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False
        )
    except Exception as exc:
        PasswordResetToken.objects.filter(user=user, token=token).delete()
        print(f"[forgot_password] send_mail failed for user_id={user.id}: {exc}")
        return Response(
            {
                "success": False,
                "message": "Unable to send reset email. Please try again later.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "success": True,
            "message": "If an account exists with this email, a password reset link has been sent."
        },
        status=status.HTTP_200_OK
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    serializer = ResetPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    token = serializer.validated_data["token"]
    password = serializer.validated_data["password"]

    try:
        reset_token = PasswordResetToken.objects.select_related("user").get(
            token=token
        )
    except PasswordResetToken.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Invalid or expired reset link.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if timezone.now() - reset_token.created_at > timedelta(hours=1):
        reset_token.delete()
        return Response(
            {
                "success": False,
                "message": "Invalid or expired reset link.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = reset_token.user
    if not user.is_active:
        return Response(
            {
                "success": False,
                "message": "User is not active.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(password)
    user.save()
    PasswordResetToken.objects.filter(user=user).delete()

    return Response(
        {
            "success": True,
            "message": "Password reset successfully. You can now log in.",
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard(request):
    today = timezone.now().date()
    total_users = User.objects.count()
    total_roles = Role.objects.count()
    total_books = Book.objects.count()
    books_added_today = Book.objects.filter(created_at__date=today).count()
    users_added_today = User.objects.filter(date_joined__date=today).count()

    return Response({
        "success": True,
        "message": "Dashboard retrieved successfully.",
        "data": {
            "total_users": total_users,
            "total_roles": total_roles,
            "total_books": total_books,
            "books_added_today": books_added_today,
            "users_added_today": users_added_today,
        },
    })


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def get_profile(request):
    user = request.user

    if request.method == "GET":
        serializer = ProfileSerializer(user)
        return Response({
            "success": True,
            "message": "Profile retrieved successfully.",
            "data": serializer.data,
        })

    serializer = UpdateProfileSerializer(
        data=request.data,
        context={"user": user},
    )
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data
    user.first_name = data["first_name"]
    user.last_name = data["last_name"]
    user.email = data["email"]
    user.username = data["email"]
    password = data.get("password") or ""
    if password:
        user.set_password(password)
    user.save()

    return Response({
        "success": True,
        "message": "Profile updated successfully.",
        "data": ProfileSerializer(user).data,
    })

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def change_user_status(request):
    serializer = ChangeUserStatusSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    user_id = serializer.validated_data["user_id"]
    is_active = serializer.validated_data["is_active"]

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "User not found."
            },
            status=status.HTTP_404_NOT_FOUND
        )
    user.is_active = is_active
    user.save()
    return Response(
        {
            "success": True,
            "message": f"User {'activated' if is_active else 'deactivated'} successfully."
        }
    )
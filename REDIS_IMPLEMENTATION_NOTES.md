# Redis Implementation Notes — User Profile Cache on Login

This document explains how Redis was added to cache **user profile details** returned by the login API, the steps followed, issues faced during implementation, and how each issue was fixed.

---

## 1. Goal

Cache serialized user profile data in Redis after a successful login so that:

TTL - Time-to-Live (TTL)—a timer or hop limit that dictates how long data remains valid

- The **first login** for a user within the TTL window loads profile data from **PostgreSQL**, then stores it in Redis.
- Later logins for the same user (within TTL) load profile data from **Redis** instead of hitting PostgreSQL again for the profile payload.

**Important:** Redis does **not** replace authentication. Password checks and JWT generation still use Django/PostgreSQL. Redis only caches the **user profile payload** attached to the login response.

---

## 2. Tech Stack Used

| Piece | Choice |
|--------|--------|
| Backend | Django + Django REST Framework |
| Cache library | `django-redis` |
| Cache API | `django.core.cache.cache` |
| Redis DB index | `/1` (`redis://127.0.0.1:6379/1`) |
| Cache key | `user_{user.id}` |
| TTL | `600` seconds (10 minutes) |
| Serialized shape | `UserProfileSerializer` output |

---

## 3. Steps to Implement Redis

### Step 1 — Install Redis and Python package

1. Install and start Redis locally (example on macOS):

```bash
brew install redis
brew services start redis
# or: redis-server
```

2. Install the Django Redis backend:

```bash
pip install django-redis
```

### Step 2 — Configure Django cache settings

In `server/newproject/newproject/settings.py`:

```python
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }
}
```

This tells Django that `cache.get()` / `cache.set()` should talk to Redis instead of the default in-memory/local-memory cache.

### Step 3 — Import Django cache in the API views

In `server/newproject/api/views.py`:

```python
from django.core.cache import cache
```

### Step 4 — Cache user profile inside the login view

After successful authentication and JWT generation:

1. Build a key: `user_{user.id}`
2. Try `cache.get(cache_key)`
3. On **hit** → use cached profile (`Fetched from Redis`)
4. On **miss** → serialize with `UserProfileSerializer`, then `cache.set(..., timeout=600)` (`Fetched from PostgreSQL`)
5. Return JWT + profile in the login response

### Step 5 — Keep a correct login flow around caching

Final login order (as implemented):

1. Validate request body with `LoginSerializer`
2. Normalize email (`strip().lower()`)
3. Look up user by email (`email__iexact`)
4. If not found → `401 Invalid email or password.`
5. If `user.is_active` is false → `403` inactive account message
6. Call `authenticate(username=user.username, password=password)`
7. If `authenticate()` returns `None` → `401 Invalid email or password.`
8. Generate JWT (`RefreshToken.for_user(user)`)
9. Check Redis / cache serialized user profile
10. Return success response with tokens + user

### Step 6 — Align frontend with the new login response

Login response shape used with Redis:

```json
{
  "success": true,
  "message": "Login successful.",
  "access": "<jwt access token>",
  "refresh": "<jwt refresh token>",
  "user": {
    "user_id": 1,
    "email": "...",
    "first_name": "...",
    "last_name": "...",
    "role_id": 1,
    "role_name": "...",
    "is_active": true,
    "date_joined": "..."
  }
}
```

Frontend (`client/app/src/pages/Login.jsx`) was updated to read:

- `data.access` → stored as `access_token`
- `data.refresh` → stored as `refresh_token`
- `data.user` → mapped into the local user object (`id` from `user_id`, plus name/email/role fields)

---

## 4. How the Cache Flow Works

```text
Login request
    │
    ▼
Validate body
    │
    ▼
Find user by email + is_active + authenticate
    │
    ▼
Generate JWT
    │
    ▼
cache.get("user_<id>")
    │
    ├── HIT  → use Redis profile  → print "Fetched from Redis"
    │
    └── MISS → serialize from Postgres
              → cache.set("user_<id>", data, 600)
              → print "Fetched from PostgreSQL"
    │
    ▼
Return { success, message, access, refresh, user }
```

### Relevant backend code (login)

File: `server/newproject/api/views.py`

- Key: `f"user_{user.id}"`
- Read: `cache.get(cache_key)`
- Write: `cache.set(cache_key, user_data, timeout=600)`
- Hit check: `if cached_user is not None:` (safer than truthiness alone)

---

## 5. Issues Faced During Implementation

### Issue 1 — Login response shape changed and broke frontend auth

**Symptom**

- Login itself returned `200`
- Immediately after login, `/api/modules/` returned:
  - `401 Unauthorized`
  - `Authentication credentials were not provided`

**Why it looked like a Redis / modules permission problem**

- Modules endpoint requires JWT (`IsAuthenticated`)
- It felt like Redis/login broke module access

**Root cause**

While adding Redis, the login response was changed from the old frontend-expected shape:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "access_token": "...",
    "refresh_token": "..."
  }
}
```

to:

```json
{
  "success": true,
  "access": "...",
  "refresh": "...",
  "user": { ... }
}
```

The frontend still read `data.data.access_token`. That was `undefined`, so `localStorage` stored an empty token. `apiFetch` then called `/modules/` **without** an `Authorization: Bearer ...` header.

**Fix**

- Updated `Login.jsx` to read `data.access`, `data.refresh`, and `data.user`
- Mapped `user_id` → local `id`
- Continued saving tokens via existing `saveAuth({ access_token, refresh_token, user })`

**Lesson**

Changing login response fields while adding Redis can break auth even when Redis itself works.

---

### Issue 2 — Incomplete login flow (missing safety checks)

**Symptom / risk**

Early Redis login version did:

- validate → authenticate → JWT → Redis → response

Missing:

- email lookup before auth
- `is_active` check
- handling `authenticate() is None`

**Why this mattered**

- Wrong password could make `user = None`, then `RefreshToken.for_user(user)` / `user.id` crash
- Inactive users were not given a clear `403` message
- Old correct logic existed only as dead/commented code after an early `return`

**Fix**

Rewrote login to follow the full ordered flow listed in **Step 5**, and removed obsolete commented code.

---

### Issue 3 — Dead / unreachable old login code

**Symptom**

After the new Redis `return Response(...)`, a large old login block remained in the file (commented or unreachable). This caused confusion and earlier even an `IndentationError` while editing.

**Fix**

- Kept one clean login implementation
- Removed the duplicate/old commented path

---

### Issue 4 — Cache hit check using truthiness only

**Risk**

`if cached_user:` treats some valid falsy cached values as a miss.

**Fix**

Use:

```python
if cached_user is not None:
```

For this project the profile dict is always truthy when present, but `is not None` is the safer pattern.

---

### Issue 5 — Stale profile data (known limitation)

**Symptom / behavior**

If a user’s name/role/profile is updated in the DB, Redis can still return the old profile for up to **10 minutes** (TTL = 600).

**Current status**

Not fully solved yet with explicit invalidation. TTL expiry eventually refreshes the data.

**Recommended follow-up**

On user/profile update (and optionally on role change), delete the cache key:

```python
cache.delete(f"user_{user.id}")
```

---

## 6. How to Verify Redis Is Working

### Method A — Django server logs (easiest)

1. Log in once → expect: `Fetched from PostgreSQL`
2. Log in again within 10 minutes → expect: `Fetched from Redis`

### Method B — Django shell

```bash
cd server/newproject
python3 manage.py shell
```

```python
from django.core.cache import cache

cache.set("ping", "pong", 60)
print(cache.get("ping"))  # pong

# After logging in as a known user id:
print(cache.get("user_1"))
```

### Method C — redis-cli

```bash
redis-cli
SELECT 1
KEYS *
```

Django-redis often prefixes keys (for example something like `:1:user_1`). Inspect matching keys after a login cache miss.

### Method D — Confirm Redis process is running

If Redis is down, `cache.get` / `cache.set` can fail during login. Start Redis before testing.

---

## 7. Files Touched

| File | Change |
|------|--------|
| `server/newproject/newproject/settings.py` | Added `CACHES` Redis config |
| `server/newproject/api/views.py` | Login flow + Redis get/set for user profile |
| `client/app/src/pages/Login.jsx` | Parse new login response (`access` / `refresh` / `user`) |

Supporting pieces already in the project:

- `UserProfileSerializer` — profile payload shape
- Frontend `auth.js` — stores `access_token` / `refresh_token` and sends Bearer token on API calls

---

## 8. What Redis Caches vs What It Does Not

| Cached in Redis | Not cached / still from DB or auth |
|-----------------|-------------------------------------|
| Serialized profile from `UserProfileSerializer` | Password verification |
| Login response `user` object | JWT generation |
| Key `user_<id>` for 10 minutes | Role permission checks on other APIs (e.g. modules) |

---

## 9. Summary

Redis was integrated through Django’s cache framework (`django-redis`) to store login user profile details under `user_<id>` for 10 minutes.

Main implementation challenges were not Redis connectivity itself, but:

1. Breaking the frontend by changing the login JSON shape
2. Leaving login auth/error handling incomplete while focusing on cache
3. Dead code / confusion from the old login path
4. Awareness of stale cache until TTL expires (invalidation still recommended)

After fixing the frontend token mapping and restoring the full login validation flow, Redis caching for user profile details works as intended: first hit Postgres, subsequent hits Redis within the TTL window.

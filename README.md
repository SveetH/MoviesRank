# MoviesRank

MoviesRank is a Django REST Framework API for browsing movies and, with an account, liking, rating, and commenting on them.

## Requirements and local setup

Python 3.9–3.12 is compatible with the pinned dependencies; this project was tested with
Python 3.9.7.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API is available at `http://127.0.0.1:8000/api/`; the Django admin is at `/admin/`.
The development secret key is only a local fallback. Set `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`,
and `DJANGO_ALLOWED_HOSTS` in deployment environments.

## React frontend

The React/TypeScript frontend lives in `frontend/` and uses Vite for development and production
builds. Node.js 20.19 or newer is required. In a separate terminal, while the Django API is
running, start the frontend with:

```powershell
cd frontend
npm install
npm run dev
```

Visit `http://127.0.0.1:5173/`. Vite proxies `/api` requests to `http://127.0.0.1:8000`;
override the target with `API_PROXY_TARGET` if Django is listening elsewhere. Create a
production bundle with `npm run build` in `frontend/`; serve the built `frontend/dist/` directory
behind a web server that forwards `/api/` to Django.

Django 4.2 is pinned to support the Python 3.9 runtime available in this environment.
That Django release is no longer supported for security fixes; before production deployment,
upgrade to a maintained Python version and a currently supported Django release.

To permit a non-staff account to manage movie records, create a Django auth group named
`Movie Managers` in the admin and add the account to that group. Staff and superuser
accounts can also manage movies. Genres are managed through the Django admin.

## Sample movie catalog

Import the curated 30-movie sample catalog and its poster credits into the local database:

```powershell
python manage.py migrate
python manage.py import_wikimedia_movies
```

The import is safe to rerun: it updates the same movies by Wikidata ID and creates any
missing genres. Movie facts are sourced from Wikidata; posters are hosted on Wikimedia
Commons. Each movie keeps links to its source records and the Commons poster page, along
with the available creator attribution and license label. The frontend displays these
credits on movie cards and detail pages. This curated catalog is not IMDb's Top 30.

## Authentication

Registration and token endpoints:

- `POST /api/auth/register/` — `{ "username": "...", "email": "...", "password": "..." }`
- `POST /api/auth/login/` — `{ "username": "...", "password": "..." }`; returns access and refresh tokens
- `POST /api/auth/refresh/` — `{ "refresh": "..." }`
- `POST /api/auth/logout/` — authenticated request with `{ "refresh": "..." }`; blacklists that account's refresh token

Send the access token on authenticated requests as `Authorization: Bearer <access-token>`.
Access tokens last 60 minutes and refresh tokens last one day. Registration, login, and
token refresh are public by necessity. Movie and comment reads are public; all other
user actions require authentication.

## API endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/movies/` | Public | Browse movies |
| GET | `/api/movies/{id}/` | Public | Movie details |
| POST | `/api/movies/` | Movie Manager | Create a movie |
| PUT/PATCH/DELETE | `/api/movies/{id}/` | Movie Manager | Edit or delete a movie |
| POST/DELETE | `/api/movies/{id}/like/` | Authenticated | Like or unlike a movie |
| POST/PUT | `/api/movies/{id}/rating/` | Authenticated | Set or update your 1–5 star rating |
| DELETE | `/api/movies/{id}/rating/` | Authenticated | Remove your rating |
| GET | `/api/movies/{id}/interaction/` | Authenticated | Read your like and rating for a movie |
| GET/POST | `/api/movies/{id}/comments/` | Public read; authenticated write | List or add comments |
| DELETE | `/api/comments/{id}/` | Author or Movie Manager | Delete a comment |
| GET | `/api/movies/liked/` | Authenticated | List movies you have liked |

Ratings and likes are unique per user/movie pair. Movie responses include `likes_count`,
`average_rating` (null when unrated), and `rating_count`. Comments can be read publicly;
only their author or a Movie Manager can delete them.

### Search, filtering, and ordering

Movie listing supports:

- `?search=<text>` — searches movie name, description, and genre name
- `?genre=<slug>` — exact genre slug
- `?release_after=YYYY-MM-DD` and `?release_before=YYYY-MM-DD`
- `?ordering=name`, `?ordering=-release_date`, `?ordering=-average_rating`, or `?ordering=-likes_count`
- `?page=2` — page-number pagination, 20 results per page

## Data model

- `Account` extends Django's `AbstractUser` and requires a unique email address.
- `Movie` stores name, description, optional release date, runtime, poster URL and credits,
  source links, and genres.
- `Like`, `Rating`, and `Comment` are separate user/movie relationship models.
- `Genre` is reusable and related to movies many-to-many.
- Movie management is assigned using Django Groups instead of a separate role table.

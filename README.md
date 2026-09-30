# King Mongkut Social Frontend

Production-oriented Vite + Vanilla TypeScript SPA for the King Mongkut Social backend.

## Stack

- Vite 8 + Vanilla TypeScript
- Zod for client-side form/environment validation
- Native Fetch API with centralized API client
- History API SPA router (no framework dependency)
- Vitest + ESLint + strict TypeScript
- Nginx production image with SPA fallback and security headers

## Security model

The frontend follows the backend authentication contract:

- Access tokens are kept **in memory only**. They are never persisted in `localStorage` or `sessionStorage`.
- Refresh tokens stay in the backend-issued `HttpOnly` cookie and are never readable by frontend JavaScript.
- Requests use `credentials: 'include'` so refresh/logout can send the cookie.
- A protected request that receives `401` triggers one shared refresh request. Concurrent `401`s reuse the same in-flight refresh to avoid token-rotation races.
- After successful refresh, the original request retries once.
- User-authored post content is inserted into the DOM with `textContent`, not injected as HTML.
- Protected member routes require an authenticated user with a complete profile. Faculty and department are persisted by the API.
- Login `returnTo` values only accept same-origin relative paths to avoid open redirects.

## Backend compatibility

Expected backend base URL in development:

```text
http://localhost:4000/api/v1
```

The supplied backend is configured with:

```text
CORS_ORIGINS=http://localhost:5173
```

That matches the default Vite dev server used here.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

Start the backend separately on `http://localhost:4000` and configure its Google OAuth client using [the setup guide](../king-mongkut-social-api/docs/google-auth.md). Client secrets stay exclusively on the backend. Only `@kmitl.ac.th`, `@mail.kmutt.ac.th` and `@email.kmutnb.ac.th` accounts are accepted.

## Environment

```env
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

`VITE_*` values are compiled into the frontend bundle at build time and are public. Never place secrets in frontend environment variables.

## Commands

```bash
npm run dev        # Vite development server
npm run build      # strict TypeScript check + production build
npm run preview    # preview production build
npm run typecheck  # TypeScript only
npm run lint       # ESLint
npm run test       # Vitest
npm run check      # typecheck + lint + tests
```

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Published posts, search, pagination |
| `/posts/:id` | Public / optional auth | Read a published post; owner/admin can also read drafts |
| `/profile` | Authenticated | View your profile, posts, friends, photos, and group chats |
| `/profile/edit` | Authenticated | Edit display name, username, bio, academic details, and profile images |
| `/profile/:id` | Public / optional auth | View a user's public profile and published posts |
| `/login`, `/register` | Guest | Google sign-in / automatic registration |
| `/auth/callback` | Public | Route the restored session after Google |
| `/complete-profile` | Authenticated | Save faculty and department before member access |
| `/dashboard` | Authenticated | Current user's drafts + published posts |
| `/dashboard/posts/new` | Authenticated | Create post |
| `/dashboard/posts/:id/edit` | Authenticated owner/admin | Edit post |
| `/connections` | Authenticated | Find people and manage friend requests |
| `/chat` | Authenticated | Direct and group conversations |

## Production build

```bash
npm run build
```

Static output is written to `dist/`.

### Docker

Build with the production API URL:

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1 \
  -t king-mongkut-social-app .

docker run --rm -p 8080:80 king-mongkut-social-app
```

The Nginx config includes SPA fallback (`try_files ... /index.html`), immutable caching for fingerprinted assets, no-cache for the app shell, basic response hardening headers, and `/healthz`.

## Cross-site cookie deployment note

If frontend and API are deployed on different **sites** (not just different subdomains/ports on the same site), backend cookie and CORS settings must be compatible with credentialed cross-origin requests. Typically this means HTTPS, an explicit frontend origin, and an appropriate `SameSite`/`Secure` refresh cookie policy. Keep this decision on the backend; the frontend already sends `credentials: 'include'`.

## Project structure

```text
src/
  app/                 application shell/navigation
  config/              environment parsing
  core/
    api/                fetch client + normalized API errors
    auth/               in-memory auth state + auth requests
    router/             tiny History API router + guards
    ui/                 safe DOM helpers/toasts
    utils/              formatting/pagination helpers
  modules/
    auth/               login/register pages
    posts/              posts API + list/detail/dashboard/editor pages
    profile/            public profile, tabs, and profile editing
    friends/            connections and friend actions
    chats/              direct and group conversations
    shared/             shared form helpers
  types/                API contracts
  validation/           Zod schemas mirroring backend constraints
```

## Backend API assumptions

This frontend was built against the backend contract bundled with the project:

- `GET /auth/google` (browser navigation)
- `GET /auth/google/callback` (Google redirect)
- `PATCH /auth/profile`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /posts`
- `GET /posts/mine`
- `GET /posts/:id`
- `GET /users/:id/profile`
- `PATCH /users/me/profile`
- `POST /users/me/avatar` and `POST /users/me/cover` (multipart image uploads)
- `DELETE /users/me/avatar` and `DELETE /users/me/cover`
- `GET /users/uploads/:filename`
- `GET /users/:id/posts` (supports `imagesOnly=1` for the photos tab)
- `GET /users/:id/friends`
- `GET /friends` and `GET /friends/requests`
- `GET /friends/suggestions`
- `DELETE /friends/requests/:requestId`
- `POST /posts`
- `PATCH /posts/:id`
- `DELETE /posts/:id`

Successful JSON responses use `{ success: true, data: ... }`; error responses use `{ success: false, error: { code, message, details? } }`.

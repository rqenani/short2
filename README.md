# short.al – Railway Fullstack URL Shortener

A production-ready starter for **short.al** on **Railway**:
- **Backend**: Node.js + Express + Prisma (PostgreSQL)
- **Frontend**: React + Vite + Tailwind (served statically by Express)
- **DB**: PostgreSQL (Railway)
- **Auth**: Email/Password → JWT (admin-only)
- **Features**: Shorten URLs, custom slug, stats (clicks), domains, interstitial ads, simple admin portal

## One-Service Deployment (Recommended)
The backend serves the frontend build from `backend/public`, so you only deploy **one Railway service**.

### Quick Start (Local)
1. Install Node 18+ and PNPM or NPM.
2. Create a Postgres DB locally or use Railway's.
3. Copy `.env.example` to `.env` and fill values.
4. Run:
   ```bash
   npm run setup
   npm start
   ```
   App will listen on `http://localhost:4000` by default.

### Deploy on Railway
1. Create a new **PostgreSQL** database in Railway. Copy the `DATABASE_URL` it gives you.
2. Create a new **Service** from this repository (or upload the zip and connect repo later).
3. Set the following **Environment Variables** in the Railway service:
   - `DATABASE_URL` = the Postgres connection string from Railway
   - `JWT_SECRET` = a strong random string
   - `ADMIN_EMAIL` = your email (for the first admin user)
   - `ADMIN_PASSWORD` = a strong password (first admin creation)
   - `BASE_URL` = your domain (e.g., `https://short.al`)
   - `INTERSTITIAL_SECONDS` = `0` to disable ad page, or a number (e.g., `3`)
4. Deploy. Railway will:
   - Install deps, build frontend, run Prisma generate & migrate
   - Start the server on the provided `PORT`
5. Point your domain **short.al** to Railway (CNAME).

### Endpoints
- **POST** `/api/auth/login` → `{ email, password }` → `{ token }`
- **POST** `/api/shorten` → `{ url, slug? }` → `{ slug, shortUrl }`
- **GET** `/:slug` → Redirect to original URL (optionally show interstitial ad)
- **GET** `/api/links` (auth) → list latest links
- **GET** `/api/stats/:slug` (auth) → clicks by day
- **GET** `/api/config/ads` (auth) → ad config
- **POST** `/api/config/ads` (auth) → update ad config `{ enabled, html, seconds }`
- **POST** `/api/domains` (auth) → add domain `{ host }`

### Admin Portal
- Visit `/admin` → login with `ADMIN_EMAIL` & `ADMIN_PASSWORD` (first time creates user).
- Manage links, view stats, set interstitial ad HTML.

### Notes
- For QR Codes, the frontend generates them client-side.
- For advanced geolocation/UA parsing, you can augment the `/resolve` flow or add a worker.
- Security: Ensure `JWT_SECRET` is strong; consider rate limiting and URL validation in production.

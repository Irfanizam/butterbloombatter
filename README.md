# 🍪 ButterBloomBatter

A full-stack web app for the ButterBloomBatter cookie business — a public storefront and an admin dashboard (products, orders, customers, finance).

## Tech Stack

| Layer    | Technology                                       |
|----------|--------------------------------------------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS      |
| State    | Zustand (auth) + React Query (server state)      |
| Backend  | Node.js + Express + TypeScript                   |
| ORM      | Prisma                                           |
| Database | PostgreSQL (Docker locally, Supabase in prod)    |
| Auth     | JWT (access in memory + refresh httpOnly cookie) |
| Images   | Multer → Cloudinary                              |
| Deploy   | Vercel (frontend) + Render.com (backend)         |

## Project Structure

```
ButterBloomBatter/
├── backend/     Express + Prisma API
├── frontend/    React + Vite SPA
└── db/          docker-compose (PostgreSQL)
```

## Local Dev Setup

```bash
# 1. Install dependencies (root, backend, frontend)
npm run setup

# 2. Start PostgreSQL
npm run db:up

# 3. Backend: copy env, migrate, seed
cd backend
cp .env.example .env
npm run db:migrate
npm run db:seed

# 4. Run both apps from the root
cd ..
npm run dev
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:4000 (health check: `/api/health`)

> **Note:** if you already run PostgreSQL natively on port 5432, the Docker DB is
> published on host port **5433** (see `db/docker-compose.yml`); `DATABASE_URL`
> in `.env` points there.

Seed login: `admin@butterbloombatter.com` / `admin123` (ADMIN), `staff@butterbloombatter.com` / `staff123` (STAFF).

## Cloudinary setup

Product images upload to Cloudinary. Create a free account at
[cloudinary.com](https://cloudinary.com), then from the dashboard copy
**Cloud Name**, **API Key**, and **API Secret** into `backend/.env`:

```env
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

## Deployment

Three services. **Names must contain `butterbloombatter`** so URLs read e.g.
`butterbloombatter.vercel.app`.

### 1. Database — Supabase (free PostgreSQL)
1. Create a project named `butterbloombatter`.
2. Copy the connection string (Project Settings → Database → URI) — use the
   pooled/Session connection string for serverless-friendly access.
3. This becomes `DATABASE_URL` on Render.

### 2. Backend — Render.com
- Service name: **`butterbloombatter-api`** → `https://butterbloombatter-api.onrender.com`
- Root directory: `backend`
- Build: `npm install --include=dev && npx prisma generate && npx prisma migrate deploy && npm run build`
  (`--include=dev` is required because `NODE_ENV=production` otherwise skips the
  `@types/*` + `typescript` devDependencies that `tsc` needs to compile.)
- Start: `npm start`
- Env vars (Render dashboard): `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
  `JWT_EXPIRES_IN=15m`, `JWT_REFRESH_EXPIRES_IN=7d`, `CLOUDINARY_*`, `NODE_ENV=production`,
  and `CLIENT_URL=https://butterbloombatter.vercel.app,http://localhost:5173`.
- A `backend/render.yaml` blueprint is included. After first deploy, seed once
  (optional) from the Render Shell: `npm run db:seed`.

### 3. Frontend — Vercel
- Project name: **`butterbloombatter`** → `https://butterbloombatter.vercel.app`
- Root directory: `frontend` (build `npm run build`, output `dist`)
- Env var: `VITE_API_BASE_URL=https://butterbloombatter-api.onrender.com`
- `frontend/vercel.json` handles SPA rewrites.

### Running migrations on production
Migrations apply automatically via the Render build command
(`npx prisma migrate deploy`). To run manually against the production DB:

```bash
cd backend
DATABASE_URL="<supabase-connection-string>" npx prisma migrate deploy
```

### Service URLs
| Service  | URL |
|----------|-----|
| Frontend | https://butterbloombatter.vercel.app |
| Backend  | https://butterbloombatter-api.onrender.com (health: `/api/health`) |
| Database | Supabase project `butterbloombatter` |

## Build Progress

- [x] **Phase 1 — Foundation:** scaffold + config + first migration
- [x] **Phase 2 — Backend Core:** auth, products/categories/customers, orders/finance/dashboard, seed
- [x] **Phase 3 — Frontend Core:** API layer, auth, layouts, dashboard
- [x] **Phase 4 — Admin Pages:** products, categories, orders, customers, finance
- [x] **Phase 5 — Public Storefront:** home, menu, contact, inquiries
- [x] **Phase 6 — Polish & Deploy:** CORS allowlist, vercel.json, render.yaml, deploy docs

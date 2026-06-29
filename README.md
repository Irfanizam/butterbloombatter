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

## Build Progress

- [x] **Phase 1 — Foundation:** folder scaffold + config files
- [ ] Phase 2 — Backend Core
- [ ] Phase 3 — Frontend Core
- [ ] Phase 4 — Admin Pages
- [ ] Phase 5 — Public Storefront
- [ ] Phase 6 — Polish & Deploy

> Cloudinary setup, production migrations, and deployment (Vercel / Render / Supabase) are documented in Phase 6.

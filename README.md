# SmartPark AI

SmartPark AI is a full-stack realtime smart-city parking platform built for hackathon demo and production evolution.

- Live Demo: `https://your-live-demo-url`
- GitHub Repo: `https://github.com/your-org/smartpark-ai`

## What It Does

SmartPark AI provides a live parking command center with:
- realtime slot map updates,
- reservation workflows with pricing,
- analytics and environmental dashboards,
- IoT simulation pipeline (MQTT and Raspberry Pi payload simulation),
- role-based secured backend APIs.

## Core Features

- Realtime Parking Operations
  - 120-slot live grid with Socket.IO updates
  - occupancy summary and zone filtering
  - slot reservation modal with pricing breakdown

- Reservation Engine
  - role-aware APIs (DRIVER / OWNER / ADMIN)
  - status lifecycle (UPCOMING, ACTIVE, COMPLETED, CANCELLED)
  - conflict checks and transaction-safe updates

- Analytics + Environmental Intelligence
  - occupancy trend charts
  - revenue trend and top-slot insights
  - fuel / CO2 / time savings dashboards

- Voice Assistant
  - bilingual quick queries (Hindi / English)
  - API-backed intent responses

- Raspberry Pi Simulation (Section 6)
  - start/stop simulator from UI
  - randomized slot updates
  - device payload ingestion endpoint
  - live occupancy event emissions

## AMD Technology Integration

SmartPark AI follows an AMD-aligned edge-to-cloud design:
- AMD EPYC: cloud API and PostgreSQL workloads
- AMD Ryzen: facility edge gateway simulation
- AMD Instinct + ROCm: AI inference extension path
- AMD Adaptive SoCs: IoT controller tier concept

See full mapping and pitch content in [docs/AMD_ARCHITECTURE.md](docs/AMD_ARCHITECTURE.md).

## Architecture (Mermaid)

```mermaid
flowchart TD
  A[IoT Sensors / Cameras / Gates] --> B[AMD Adaptive SoC Device Layer]
  B --> C[AMD Ryzen Edge Node]
  C --> D[MQTT/HTTPS Secure Uplink]
  D --> E[SmartPark Backend API\nNode.js + Express + Socket.IO]
  E --> F[(PostgreSQL + Prisma)]
  E --> G[Realtime Events]
  G --> H[React Dashboard]
  E --> I[Simulation Routes\nstart/stop/pi-payload/status]
  E --> J[AI Service (Future)\nAMD Instinct + ROCm]
```

## Tech Stack

- Backend: Node.js, Express.js
- Database: PostgreSQL, Prisma
- Frontend: React, Vite, Tailwind CSS
- Realtime: Socket.IO
- IoT Simulation: MQTT (Mosquitto)
- Security: JWT, RBAC, rate limiting, validation middleware
- Deployment: Render.com

## Project Structure

```text
SmartPark-AI/
├── server/
├── client/
├── docs/
├── render.yaml
└── README.md
```

## Local Setup

### 1) Clone and install

```bash
git clone https://github.com/your-org/smartpark-ai.git
cd smartpark-ai
```

### 2) Backend setup

```bash
cd server
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Backend runs on `http://localhost:4000`.

### 3) Frontend setup

```bash
cd ../client
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

## Render Deployment (Production-Safe)

This repo includes [render.yaml](render.yaml) for Blueprint deploy.

### Steps

1. Push code to GitHub.
2. In Render: `New` -> `Blueprint`.
3. Select repository and apply `render.yaml`.
4. Verify env vars:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `FRONTEND_URL`
   - `DEVICE_API_KEY`
   - `TRUST_PROXY=true`
5. Deploy services:
   - `smartpark-server` (Web Service)
   - `smartpark-client` (Static Site)
   - `smartpark-db` (PostgreSQL)

## Demo Credentials

- Admin: `admin@smartpark.ai` / `Admin@123`
- Owner: `owner@smartpark.ai` / `Admin@123`
- Driver: `driver@smartpark.ai` / `Admin@123`

## Hackathon Judge Walkthrough (Suggested)

1. Login as Admin.
2. Open **Map Overview** and show live slot states.
3. Start **Raspberry Pi Simulator** panel and show live updates.
4. Reserve a slot and show instant state change.
5. Open **Analytics** and **Revenue** dashboards.
6. Open **Environment** page for impact storytelling.
7. Use **Voice Assistant** with English/Hindi query.
8. Show **AMD architecture mapping** from docs.

## API Highlights

- Auth: `/api/auth/*`
- Parking: `/api/parking/*`
- Reservations: `/api/reservations/*`
- Analytics: `/api/analytics/*`
- Alerts: `/api/alerts/*`
- Devices: `/api/devices/*`
- Voice: `/api/voice/query`
- Simulation: `/api/simulation/start|stop|status|pi-payload`

## Section Progress Tracker

- [x] Section 1 — Setup + DB + seed data
- [x] Section 2 — Backend APIs
- [x] Section 3 — Login + Dashboard shell
- [x] Section 4 — Map + Analytics + Environment
- [x] Section 5 — Security hardening + AMD alignment
- [x] Section 6 — Raspberry Pi simulation + deployment readiness

## Notes

- This implementation is hackathon-optimized while preserving production-safe patterns.
- For higher-scale production, add Redis adapter for Socket.IO and distributed cache/rate limits.

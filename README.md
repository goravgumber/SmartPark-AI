# SmartPark AI

SmartPark AI hackathon prototype monorepo.

## Apps
- `server/`: Express + Prisma + PostgreSQL + Socket.IO backend
- `client/`: React + Vite + Tailwind frontend

## Quick start

### Backend
```bash
cd server
cp .env.example .env
npm install
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

## AMD Technology Integration

SmartPark AI is aligned to AMD's edge-to-cloud architecture for realistic smart-city deployment.

### Cloud Compute (AMD EPYC)
- Backend APIs (Express), Socket.IO realtime gateway, and PostgreSQL are mapped to AMD EPYC cloud instances.
- EPYC high core density supports parallel API requests, websocket fanout, and analytics reads/writes.

### Edge Deployment (AMD Ryzen)
- Each facility can run an AMD Ryzen mini edge node for local MQTT aggregation, buffering, and secure uplink.
- This reduces dependency on always-on internet and improves realtime continuity at site level.

### AI Acceleration (AMD Instinct + ROCm)
- Forecasting/anomaly inference can run as a separate service on AMD Instinct GPUs.
- ROCm-based inference APIs can feed demand prediction and optimization signals back into the dashboard.

### IoT Device Layer (AMD Adaptive SoCs)
- Smart controllers can use Adaptive SoCs for on-device signal pre-processing before cloud ingestion.
- This supports low-latency edge intelligence and lower raw data transfer cost.

### Updated Architecture Flow

```text
Parking Sensors / Cameras / Gates
        |
        v
[AMD Adaptive SoC Device Layer]
        |
        v
[AMD Ryzen Edge Node @ Facility]
- MQTT normalize + forward
- local buffering/retry
        |
        v
TLS MQTT/HTTPS Uplink
        |
        v
[AMD EPYC Cloud Cluster]
- Express APIs
- Socket.IO realtime gateway
- reservation engine + RBAC
        |
        +--> [PostgreSQL on AMD EPYC]
        |
        +--> [AI Inference Service on AMD Instinct + ROCm]
                  |
                  v
          demand forecasts / anomaly signals
        |
        v
React Dashboard (Map, Analytics, Environment)
```

### Why AMD Fit Matters
- WebSocket concurrency: more worker/process parallelism on EPYC.
- PostgreSQL analytics: better mixed OLTP + aggregation headroom.
- MQTT ingestion: Ryzen edge buffering plus EPYC parallel consumers.
- Realtime dashboard performance: low-latency fanout + query throughput.

For detailed pitch-ready content, see [AMD Architecture Guide](docs/AMD_ARCHITECTURE.md).

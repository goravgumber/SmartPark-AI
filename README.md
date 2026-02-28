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

import 'dotenv/config'

// 🔥 GLOBAL ERROR HANDLERS (VERY IMPORTANT)
process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err)
})

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED PROMISE:", err)
})

console.log("🚀 Starting SmartPark server...")

import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import http from 'http'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { config } from './config.js'

// 🔍 ENV DEBUG
console.log("🔍 ENV CHECK:")
console.log("PORT:", process.env.PORT)
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL)
console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET)
console.log("FRONTEND_URL:", process.env.FRONTEND_URL)

// 🔥 IMPORT ROUTES WITH DEBUG LOGS
import authRoutes from './routes/auth.js'
console.log("✅ authRoutes loaded")

import parkingRoutes from './routes/parking.js'
console.log("✅ parkingRoutes loaded")

import reservationRoutes from './routes/reservations.js'
console.log("✅ reservationRoutes loaded")

import analyticsRoutes from './routes/analytics.js'
console.log("✅ analyticsRoutes loaded")

import alertRoutes from './routes/alerts.js'
console.log("✅ alertRoutes loaded")

import deviceRoutes from './routes/devices.js'
console.log("✅ deviceRoutes loaded")

import voiceRoutes from './routes/voice.js'
console.log("✅ voiceRoutes loaded")

import simulationRoutes from './routes/simulation.js'
console.log("✅ simulationRoutes loaded")

import { setIO } from './socket.js'
import { generalRateLimit } from './middleware/rateLimiter.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { prisma } from './db.js'

console.log("✅ Core modules loaded")

const app = express()
app.set('trust proxy', 1)

const httpServer = http.createServer(app)

console.log("⚙️ Initializing Socket.IO...")

const io = new Server(httpServer, {
  cors: {
    origin: config.frontendUrl || "*"
  },
  maxHttpBufferSize: 1e5
})

setIO(io)
console.log("✅ Socket.IO initialized")

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
)

app.use(
  cors({
    origin: process.env.FRONTEND_URL || config.frontendUrl || "*",
    credentials: true
  })
)

app.use(generalRateLimit)
app.use(express.json({ limit: '50kb' }))

console.log("✅ Middlewares initialized")

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

console.log("⚙️ Registering routes...")

app.use('/api/auth', authRoutes)
app.use('/api/parking', parkingRoutes)
app.use('/api/reservations', reservationRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/devices', deviceRoutes)
app.use('/api/voice', voiceRoutes)
app.use('/api/simulation', simulationRoutes)

console.log("✅ All routes registered")

// 🔥 SOCKET AUTH
io.use((socket, next) => {
  try {
    const authToken = socket.handshake?.auth?.token
    const headerToken = socket.handshake?.headers?.authorization?.replace('Bearer ', '')
    const token = authToken || headerToken

    if (!token) {
      return next(new Error('Unauthorized socket connection.'))
    }

    const decoded = jwt.verify(token, config.jwtSecret)
    socket.data.user = decoded
    return next()
  } catch (error) {
    console.error("❌ Socket auth error:", error.message)
    return next(new Error('Unauthorized socket connection.'))
  }
})

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id)

  socket.on('join:facility', async (facilityId) => {
    try {
      const userId = socket.data?.user?.id
      if (!userId || !facilityId) return

      const facility = await prisma.facility.findUnique({
        where: { id: String(facilityId) },
        select: { id: true }
      })

      if (!facility) return

      socket.join(facility.id)
    } catch (error) {
      console.error("❌ Socket join error:", error)
    }
  })
})

app.use(notFoundHandler)
app.use(errorHandler)

const PORT = process.env.PORT || 4000

console.log("🚀 Starting HTTP server...")

httpServer.listen(PORT, () => {
  console.log(`✅ SmartPark server listening on port ${PORT}`)
})

export { io }

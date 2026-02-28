import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import { config } from './config.js'
import authRoutes from './routes/auth.js'
import parkingRoutes from './routes/parking.js'
import reservationRoutes from './routes/reservations.js'
import analyticsRoutes from './routes/analytics.js'
import alertRoutes from './routes/alerts.js'
import deviceRoutes from './routes/devices.js'
import voiceRoutes from './routes/voice.js'
import { setIO } from './socket.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const app = express()
const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: config.frontendUrl
  }
})
setIO(io)

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true
  })
)
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/parking', parkingRoutes)
app.use('/api/reservations', reservationRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/devices', deviceRoutes)
app.use('/api/voice', voiceRoutes)

io.on('connection', (socket) => {
  socket.on('join:facility', (facilityId) => socket.join(facilityId))
  console.log('Client connected:', socket.id)
})

app.use(notFoundHandler)
app.use(errorHandler)

httpServer.listen(config.port, () => {
  console.log(`SmartPark server listening on port ${config.port}`)
})

export { io }

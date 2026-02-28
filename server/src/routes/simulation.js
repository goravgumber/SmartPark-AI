import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { getIO } from '../socket.js'

const router = Router()

const startSchema = z.object({
  facilityId: z.string().uuid(),
  intervalSeconds: z.number().int().min(1).max(60).default(5)
})

const piPayloadSchema = z.object({
  parking_id: z.string().min(1),
  device_id: z.string().min(1),
  timestamp: z.string().min(1),
  slots: z.record(z.string().regex(/^(available|occupied|reserved|disabled)$/i)),
  confidence: z.number().min(0).max(1).optional().default(0.9),
  device_health: z
    .object({
      cpuPercent: z.number().min(0).max(100).optional(),
      ramPercent: z.number().min(0).max(100).optional(),
      temperature: z.number().min(-20).max(120).optional(),
      ipAddress: z.string().max(64).optional(),
      status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE']).optional()
    })
    .optional()
})

const STATUS_MAP = {
  available: 'AVAILABLE',
  occupied: 'OCCUPIED',
  reserved: 'RESERVED',
  disabled: 'DISABLED'
}

const state = {
  intervalId: null,
  isRunning: false,
  facilityId: null,
  intervalSeconds: 0,
  updatesCount: 0,
  startedAt: null,
  isTicking: false
}

function pickRandom(array, count) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, count)
}

async function emitLiveSummary(facilityId, changedCount) {
  const [available, occupied, reserved, disabled] = await Promise.all([
    prisma.parkingSlot.count({ where: { zone: { facilityId }, status: 'AVAILABLE' } }),
    prisma.parkingSlot.count({ where: { zone: { facilityId }, status: 'OCCUPIED' } }),
    prisma.parkingSlot.count({ where: { zone: { facilityId }, status: 'RESERVED' } }),
    prisma.parkingSlot.count({ where: { zone: { facilityId }, status: 'DISABLED' } })
  ])

  const total = available + occupied + reserved + disabled
  const occupancyRate = total ? Number(((occupied / total) * 100).toFixed(2)) : 0

  const io = getIO()
  if (io) {
    io.to(facilityId).emit('occupancy:live', {
      facilityId,
      total,
      available,
      occupied,
      reserved,
      disabled,
      occupancyRate,
      changedCount,
      updatesCount: state.updatesCount,
      timestamp: new Date().toISOString()
    })
  }
}

async function simulationTick() {
  if (!state.isRunning || state.isTicking || !state.facilityId) return
  state.isTicking = true

  try {
    const candidates = await prisma.parkingSlot.findMany({
      where: {
        zone: { facilityId: state.facilityId },
        status: { in: ['AVAILABLE', 'OCCUPIED'] }
      },
      select: {
        id: true,
        slotCode: true,
        status: true,
        zone: {
          select: {
            name: true,
            facilityId: true
          }
        }
      }
    })

    if (candidates.length === 0) return

    const count = Math.min(candidates.length, Math.floor(Math.random() * 3) + 3)
    const selected = pickRandom(candidates, count)

    const io = getIO()
    await prisma.$transaction(
      selected.map((slot) =>
        prisma.parkingSlot.update({
          where: { id: slot.id },
          data: { status: slot.status === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE' }
        })
      )
    )

    if (io) {
      selected.forEach((slot) => {
        const newStatus = slot.status === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE'
        io.to(state.facilityId).emit('slot:updated', {
          slotId: slot.id,
          status: newStatus,
          slotCode: slot.slotCode,
          zone: slot.zone.name,
          facilityId: slot.zone.facilityId
        })
      })
    }

    state.updatesCount += 1
    await emitLiveSummary(state.facilityId, selected.length)
  } catch (error) {
    console.error('[simulationTick]', error)
  } finally {
    state.isTicking = false
  }
}

function stopSimulationInterval() {
  if (state.intervalId) {
    clearInterval(state.intervalId)
  }
  state.intervalId = null
  state.isRunning = false
  state.facilityId = null
  state.intervalSeconds = 0
  state.startedAt = null
  state.isTicking = false
}

router.post('/start', authMiddleware, validateBody(startSchema), async (req, res, next) => {
  try {
    const { facilityId, intervalSeconds } = req.body

    const facility = await prisma.facility.findUnique({ where: { id: facilityId }, select: { id: true } })
    if (!facility) {
      const error = new Error('Facility not found.')
      error.statusCode = 404
      throw error
    }

    if (state.isRunning) {
      const error = new Error('Simulation is already running. Stop it before starting again.')
      error.statusCode = 409
      throw error
    }

    state.isRunning = true
    state.facilityId = facilityId
    state.intervalSeconds = intervalSeconds
    state.startedAt = Date.now()
    state.updatesCount = 0
    state.intervalId = setInterval(simulationTick, intervalSeconds * 1000)

    res.json({
      success: true,
      data: {
        message: 'Simulation started',
        facilityId,
        intervalSeconds
      }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/stop', authMiddleware, async (req, res, next) => {
  try {
    if (state.isRunning) {
      stopSimulationInterval()
    }

    res.json({
      success: true,
      data: {
        message: 'Simulation stopped'
      }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/pi-payload', authMiddleware, validateBody(piPayloadSchema), async (req, res, next) => {
  try {
    const { parking_id: facilityId, device_id: deviceId, slots, device_health: deviceHealth } = req.body

    const facility = await prisma.facility.findUnique({ where: { id: facilityId }, select: { id: true } })
    if (!facility) {
      const error = new Error('Facility not found.')
      error.statusCode = 404
      throw error
    }

    const io = getIO()
    const slotEntries = Object.entries(slots)
    let slotsUpdated = 0

    for (const [slotCode, value] of slotEntries) {
      const mappedStatus = STATUS_MAP[String(value).toLowerCase()]
      if (!mappedStatus) continue

      const targetSlot = await prisma.parkingSlot.findFirst({
        where: {
          slotCode,
          zone: { facilityId }
        },
        include: {
          zone: { select: { name: true, facilityId: true } }
        }
      })
      if (!targetSlot) continue

      if (targetSlot.status !== mappedStatus) {
        await prisma.parkingSlot.update({
          where: { id: targetSlot.id },
          data: { status: mappedStatus }
        })

        if (io) {
          io.to(facilityId).emit('slot:updated', {
            slotId: targetSlot.id,
            status: mappedStatus,
            slotCode: targetSlot.slotCode,
            zone: targetSlot.zone.name,
            facilityId: targetSlot.zone.facilityId
          })
        }

        slotsUpdated += 1
      }
    }

    if (deviceHealth) {
      const device = await prisma.device.findFirst({
        where: {
          facilityId,
          OR: [{ id: deviceId }, { deviceCode: deviceId }]
        }
      })

      if (device) {
        await prisma.device.update({
          where: { id: device.id },
          data: {
            cpuPercent: deviceHealth.cpuPercent ?? device.cpuPercent,
            ramPercent: deviceHealth.ramPercent ?? device.ramPercent,
            temperature: deviceHealth.temperature ?? device.temperature,
            ipAddress: deviceHealth.ipAddress ?? device.ipAddress,
            status: deviceHealth.status ?? device.status,
            lastPingAt: new Date()
          }
        })
      }
    }

    await emitLiveSummary(facilityId, slotsUpdated)

    res.json({
      success: true,
      data: {
        processed: true,
        slotsUpdated
      }
    })
  } catch (error) {
    next(error)
  }
})

router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        isRunning: state.isRunning,
        facilityId: state.facilityId,
        intervalSeconds: state.intervalSeconds,
        updatesCount: state.updatesCount,
        uptimeSeconds: state.startedAt ? Math.floor((Date.now() - state.startedAt) / 1000) : 0
      }
    })
  } catch (error) {
    next(error)
  }
})

export default router

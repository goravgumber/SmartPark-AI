import { Router } from 'express'
import { prisma } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getIO } from '../socket.js'

const router = Router()

function ensureOwnerOrAdmin(req) {
  if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
    const error = new Error('Only OWNER or ADMIN can perform this action.')
    error.statusCode = 403
    throw error
  }
}

function generateReservationCode() {
  const random = Math.floor(1000 + Math.random() * 9000)
  return `SPK-${random}`
}

function calculatePricing(ratePerHour, durationHours) {
  const baseAmount = Number((ratePerHour * durationHours).toFixed(2))
  const serviceFee = Number((baseAmount * 0.1).toFixed(2))
  const gst = Number(((baseAmount + serviceFee) * 0.18).toFixed(2))
  const totalAmount = Number((baseAmount + serviceFee + gst).toFixed(2))
  return { baseAmount, serviceFee, gst, totalAmount }
}

async function emitSlotUpdated(slot) {
  const io = getIO()
  if (!io) return

  io.to(slot.zone.facilityId).emit('slot:updated', {
    slotId: slot.id,
    status: slot.status,
    slotCode: slot.slotCode,
    zone: slot.zone.name,
    facilityId: slot.zone.facilityId
  })
}

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { slotId, vehicleNumber, driverName, driverPhone, durationHours, paymentMethod, startTime } = req.body

    if (!slotId || !vehicleNumber || !driverName || !driverPhone || !durationHours || !startTime) {
      const error = new Error('slotId, vehicleNumber, driverName, driverPhone, durationHours, and startTime are required.')
      error.statusCode = 400
      throw error
    }

    const duration = Number(durationHours)
    if (Number.isNaN(duration) || duration <= 0) {
      const error = new Error('durationHours must be a positive number.')
      error.statusCode = 400
      throw error
    }

    const reservationStart = new Date(startTime)
    if (Number.isNaN(reservationStart.getTime())) {
      const error = new Error('startTime is invalid.')
      error.statusCode = 400
      throw error
    }

    const reservationEnd = new Date(reservationStart.getTime() + duration * 60 * 60 * 1000)

    const slot = await prisma.parkingSlot.findUnique({
      where: { id: slotId },
      include: {
        zone: {
          include: {
            facility: true
          }
        }
      }
    })

    if (!slot) {
      const error = new Error('Slot not found.')
      error.statusCode = 404
      throw error
    }

    if (slot.status !== 'AVAILABLE') {
      const error = new Error('Slot is not available for booking.')
      error.statusCode = 409
      throw error
    }

    const conflict = await prisma.reservation.findFirst({
      where: {
        slotId,
        status: {
          in: ['UPCOMING', 'ACTIVE']
        },
        startTime: {
          lt: reservationEnd
        },
        endTime: {
          gt: reservationStart
        }
      }
    })

    if (conflict) {
      const error = new Error('Conflicting reservation already exists for this slot and time window.')
      error.statusCode = 409
      throw error
    }

    const { baseAmount, serviceFee, gst, totalAmount } = calculatePricing(slot.zone.ratePerHour, duration)

    let reservationCode = null
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateReservationCode()
      const exists = await prisma.reservation.findUnique({ where: { reservationCode: code } })
      if (!exists) {
        reservationCode = code
        break
      }
    }

    if (!reservationCode) {
      const error = new Error('Could not generate reservation code. Please try again.')
      error.statusCode = 500
      throw error
    }

    const createdReservation = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.create({
        data: {
          reservationCode,
          slotId,
          userId: req.user.id,
          vehicleNumber,
          driverName,
          driverPhone,
          durationHours: duration,
          baseAmount,
          totalAmount,
          paymentMethod: paymentMethod || 'UPI',
          startTime: reservationStart,
          endTime: reservationEnd,
          status: 'UPCOMING'
        },
        include: {
          slot: {
            include: {
              zone: {
                include: {
                  facility: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      })

      await tx.parkingSlot.update({
        where: { id: slotId },
        data: { status: 'RESERVED' }
      })

      return reservation
    })

    await emitSlotUpdated({
      id: createdReservation.slot.id,
      status: 'RESERVED',
      slotCode: createdReservation.slot.slotCode,
      zone: createdReservation.slot.zone
    })

    res.status(201).json({
      success: true,
      data: {
        ...createdReservation,
        pricing: {
          baseAmount,
          serviceFee,
          gst,
          totalAmount
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status).toUpperCase() : null
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100)
    const skip = (page - 1) * limit

    const where = {
      ...(status ? { status } : {}),
      ...(req.user.role === 'DRIVER' ? { userId: req.user.id } : {})
    }

    const [data, total] = await prisma.$transaction([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          slot: {
            include: {
              zone: {
                include: {
                  facility: true
                }
              }
            }
          }
        }
      }),
      prisma.reservation.count({ where })
    ])

    res.json({
      success: true,
      data: {
        data,
        total,
        page,
        limit
      }
    })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        slot: {
          include: {
            zone: {
              include: {
                facility: true
              }
            }
          }
        }
      }
    })

    if (!reservation) {
      const error = new Error('Reservation not found.')
      error.statusCode = 404
      throw error
    }

    if (req.user.role === 'DRIVER' && reservation.userId !== req.user.id) {
      const error = new Error('You are not allowed to view this reservation.')
      error.statusCode = 403
      throw error
    }

    res.json({ success: true, data: reservation })
  } catch (error) {
    next(error)
  }
})

router.put('/:id/cancel', authMiddleware, async (req, res, next) => {
  try {
    const existing = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: {
        slot: {
          include: {
            zone: true
          }
        }
      }
    })

    if (!existing) {
      const error = new Error('Reservation not found.')
      error.statusCode = 404
      throw error
    }

    if (req.user.role === 'DRIVER' && existing.userId !== req.user.id) {
      const error = new Error('You are not allowed to cancel this reservation.')
      error.statusCode = 403
      throw error
    }

    if (existing.status !== 'UPCOMING') {
      const error = new Error('Only UPCOMING reservations can be cancelled.')
      error.statusCode = 409
      throw error
    }

    const updated = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED' },
        include: {
          slot: {
            include: {
              zone: {
                include: { facility: true }
              }
            }
          }
        }
      })

      await tx.parkingSlot.update({
        where: { id: reservation.slotId },
        data: { status: 'AVAILABLE' }
      })

      return reservation
    })

    await emitSlotUpdated({
      id: updated.slot.id,
      status: 'AVAILABLE',
      slotCode: updated.slot.slotCode,
      zone: updated.slot.zone
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    next(error)
  }
})

router.post('/:id/checkin', authMiddleware, async (req, res, next) => {
  try {
    ensureOwnerOrAdmin(req)

    const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } })
    if (!reservation) {
      const error = new Error('Reservation not found.')
      error.statusCode = 404
      throw error
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedReservation = await tx.reservation.update({
        where: { id: req.params.id },
        data: { status: 'ACTIVE' },
        include: {
          slot: {
            include: {
              zone: {
                include: {
                  facility: true
                }
              }
            }
          }
        }
      })

      await tx.parkingSlot.update({
        where: { id: updatedReservation.slotId },
        data: { status: 'OCCUPIED' }
      })

      return updatedReservation
    })

    await emitSlotUpdated({
      id: updated.slot.id,
      status: 'OCCUPIED',
      slotCode: updated.slot.slotCode,
      zone: updated.slot.zone
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    next(error)
  }
})

router.post('/:id/checkout', authMiddleware, async (req, res, next) => {
  try {
    ensureOwnerOrAdmin(req)

    const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } })
    if (!reservation) {
      const error = new Error('Reservation not found.')
      error.statusCode = 404
      throw error
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedReservation = await tx.reservation.update({
        where: { id: req.params.id },
        data: { status: 'COMPLETED' },
        include: {
          slot: {
            include: {
              zone: {
                include: {
                  facility: true
                }
              }
            }
          }
        }
      })

      await tx.parkingSlot.update({
        where: { id: updatedReservation.slotId },
        data: { status: 'AVAILABLE' }
      })

      return updatedReservation
    })

    await emitSlotUpdated({
      id: updated.slot.id,
      status: 'AVAILABLE',
      slotCode: updated.slot.slotCode,
      zone: updated.slot.zone
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    next(error)
  }
})

export default router

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

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { facilityId, severity, resolved } = req.query

    const where = {
      ...(facilityId ? { facilityId: String(facilityId) } : {}),
      ...(severity ? { severity: String(severity).toUpperCase() } : {}),
      ...(typeof resolved !== 'undefined' ? { isResolved: String(resolved) === 'true' } : {})
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    res.json({ success: true, data: alerts })
  } catch (error) {
    next(error)
  }
})

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    ensureOwnerOrAdmin(req)

    const { facilityId, severity, title, description } = req.body
    if (!facilityId || !severity || !title || !description) {
      const error = new Error('facilityId, severity, title, and description are required.')
      error.statusCode = 400
      throw error
    }

    const alert = await prisma.alert.create({
      data: {
        facilityId,
        severity: String(severity).toUpperCase(),
        title,
        description
      }
    })

    const io = getIO()
    if (io) {
      io.to(facilityId).emit('alert:new', alert)
    }

    res.status(201).json({ success: true, data: alert })
  } catch (error) {
    next(error)
  }
})

router.put('/:id/resolve', authMiddleware, async (req, res, next) => {
  try {
    ensureOwnerOrAdmin(req)

    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: { isResolved: true }
    })

    const io = getIO()
    if (io) {
      io.to(alert.facilityId).emit('alert:resolved', alert)
    }

    res.json({ success: true, data: alert })
  } catch (error) {
    if (error.code === 'P2025') {
      error.statusCode = 404
      error.message = 'Alert not found.'
    }
    next(error)
  }
})

export default router

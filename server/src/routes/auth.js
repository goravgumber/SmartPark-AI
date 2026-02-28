import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../db.js'
import { config } from '../config.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

function makeToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  )
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body

    if (!name || !email || !password) {
      const error = new Error('name, email, and password are required.')
      error.statusCode = 400
      throw error
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      const error = new Error('Email is already registered.')
      error.statusCode = 409
      throw error
    }

    const validRoles = ['DRIVER', 'OWNER', 'ADMIN']
    const safeRole = validRoles.includes(String(role || '').toUpperCase())
      ? String(role).toUpperCase()
      : 'DRIVER'

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role: safeRole
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    const token = makeToken(user)
    res.status(201).json({
      success: true,
      data: {
        token,
        user
      }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      const error = new Error('email and password are required.')
      error.statusCode = 400
      throw error
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() }
    })

    if (!user) {
      const error = new Error('Invalid email or password.')
      error.statusCode = 401
      throw error
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash)
    if (!validPassword) {
      const error = new Error('Invalid email or password.')
      error.statusCode = 401
      throw error
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }

    const token = makeToken(user)
    res.json({
      success: true,
      data: {
        token,
        user: safeUser
      }
    })
  } catch (error) {
    next(error)
  }
})

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    if (!user) {
      const error = new Error('User not found.')
      error.statusCode = 404
      throw error
    }

    res.json({
      success: true,
      data: user
    })
  } catch (error) {
    next(error)
  }
})

export default router

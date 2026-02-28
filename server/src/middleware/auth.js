import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization token missing. Use Bearer <token>.',
      code: 401
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    req.user = decoded
    return next()
  } catch (error) {
    const isExpired = error?.name === 'TokenExpiredError'
    return res.status(401).json({
      success: false,
      error: isExpired ? 'Token has expired. Please login again.' : 'Invalid authentication token.',
      code: 401
    })
  }
}

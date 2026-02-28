import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Analytics routes will be added in Section 2.',
    code: 501
  })
})

export default router

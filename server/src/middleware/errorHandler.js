export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 404
  })
}

export function errorHandler(error, req, res, next) {
  console.error(error)

  const statusCode = error.statusCode || 500
  res.status(statusCode).json({
    success: false,
    error: error.message || 'Internal Server Error',
    code: statusCode
  })
}

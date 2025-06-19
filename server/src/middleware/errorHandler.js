export function errorHandler(err, req, res, next) {
  const logger = req.logger || console;
  
  // Log the error with structured data
  logger.error({
    msg: err.message,
    module: 'errorHandler',
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    disasterId: req.params?.id
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (err.code === 'PGRST116') {
    return res.status(404).json({
      error: 'Resource not found'
    });
  }

  // Default to 500 Internal Server Error
  res.status(500).json(errorResponse);
} 
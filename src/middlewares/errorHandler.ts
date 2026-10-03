import { Request, Response, NextFunction } from 'express';

/**
 * Global Express error handling middleware.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('[Unhandled Error]', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected server error occurred.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

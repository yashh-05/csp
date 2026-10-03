"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
/**
 * Global Express error handling middleware.
 */
const errorHandler = (err, req, res, next) => {
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
exports.errorHandler = errorHandler;

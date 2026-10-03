"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMiddleware = void 0;
/**
 * Middleware to restrict route access by user roles (e.g., resident, admin).
 */
const roleMiddleware = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Authorized roles: ${roles.join(', ')}`
            });
        }
        next();
    };
};
exports.roleMiddleware = roleMiddleware;

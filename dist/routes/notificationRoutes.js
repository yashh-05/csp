"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController_1 = require("../controllers/notificationController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Secure notifications endpoints
router.get('/', authMiddleware_1.authMiddleware, notificationController_1.getNotifications);
router.put('/read-all', authMiddleware_1.authMiddleware, notificationController_1.markAllAsRead);
router.put('/:id/read', authMiddleware_1.authMiddleware, notificationController_1.markAsRead);
exports.default = router;

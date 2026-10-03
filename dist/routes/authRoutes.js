"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.get('/check-pre-register', authController_1.checkPreRegistration);
// Protected routes (require token validation)
router.get('/me', authMiddleware_1.authMiddleware, authController_1.getMe);
router.get('/admins', authMiddleware_1.authMiddleware, authController_1.getAdmins);
router.put('/profile', authMiddleware_1.authMiddleware, authController_1.updateProfile);
// Admin-only member pre-registration routes
router.post('/register-member', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.roleMiddleware)(['admin']), authController_1.registerMember);
router.get('/pre-registered-members', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.roleMiddleware)(['admin']), authController_1.getPreRegisteredMembers);
exports.default = router;

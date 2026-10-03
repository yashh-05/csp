"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const announcementController_1 = require("../controllers/announcementController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const router = (0, express_1.Router)();
// Retrieve announcements (Residents & Admins)
router.get('/', authMiddleware_1.authMiddleware, announcementController_1.getAnnouncements);
// Publish announcement (Admins only)
router.post('/', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.roleMiddleware)(['admin']), announcementController_1.createAnnouncement);
exports.default = router;

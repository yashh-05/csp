"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const complaintController_1 = require("../controllers/complaintController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const router = (0, express_1.Router)();
// File a complaint (Resident only, with optional single image attachment upload)
router.post('/', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.roleMiddleware)(['resident']), uploadMiddleware_1.upload.single('image'), complaintController_1.createComplaint);
// Get complaints list (Residents get their own; Admins get all with filters)
router.get('/', authMiddleware_1.authMiddleware, complaintController_1.getComplaints);
// Get specific complaint detail
router.get('/:id', authMiddleware_1.authMiddleware, complaintController_1.getComplaintById);
// Update status (Admin only, supports optional resolution image upload)
router.put('/:id/status', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.roleMiddleware)(['admin']), uploadMiddleware_1.upload.single('image'), complaintController_1.updateComplaintStatus);
// Re-raise unresolved complaint (Resident only)
router.post('/:id/re-raise', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.roleMiddleware)(['resident']), complaintController_1.reRaiseComplaint);
exports.default = router;

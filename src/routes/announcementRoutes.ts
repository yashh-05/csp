import { Router } from 'express';
import { createAnnouncement, getAnnouncements } from '../controllers/announcementController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();

// Retrieve announcements (Residents & Admins)
router.get('/', authMiddleware as any, getAnnouncements as any);

// Publish announcement (Admins only)
router.post('/', authMiddleware as any, roleMiddleware(['admin']) as any, createAnnouncement as any);

export default router;

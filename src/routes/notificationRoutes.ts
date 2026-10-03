import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Secure notifications endpoints
router.get('/', authMiddleware as any, getNotifications as any);
router.put('/read-all', authMiddleware as any, markAllAsRead as any);
router.put('/:id/read', authMiddleware as any, markAsRead as any);

export default router;

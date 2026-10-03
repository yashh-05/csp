import { Router } from 'express';
import { 
  createComplaint, 
  getComplaints, 
  getComplaintById, 
  updateComplaintStatus, 
  reRaiseComplaint 
} from '../controllers/complaintController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = Router();

// File a complaint (Resident only, with optional single image attachment upload)
router.post(
  '/', 
  authMiddleware as any, 
  roleMiddleware(['resident']) as any, 
  upload.single('image'), 
  createComplaint as any
);

// Get complaints list (Residents get their own; Admins get all with filters)
router.get('/', authMiddleware as any, getComplaints as any);

// Get specific complaint detail
router.get('/:id', authMiddleware as any, getComplaintById as any);

// Update status (Admin only, supports optional resolution image upload)
router.put(
  '/:id/status', 
  authMiddleware as any, 
  roleMiddleware(['admin']) as any, 
  upload.single('image') as any,
  updateComplaintStatus as any
);

// Re-raise unresolved complaint (Resident only)
router.post(
  '/:id/re-raise', 
  authMiddleware as any, 
  roleMiddleware(['resident']) as any, 
  reRaiseComplaint as any
);

export default router;

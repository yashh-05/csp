import { Router } from 'express';
import { 
  register, 
  login, 
  getMe, 
  getAdmins, 
  updateProfile, 
  registerMember, 
  getPreRegisteredMembers,
  checkPreRegistration 
} from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();

// Public routes
router.post('/register', register as any);
router.post('/login', login as any);
router.get('/check-pre-register', checkPreRegistration as any);

// Protected routes (require token validation)
router.get('/me', authMiddleware as any, getMe as any);
router.get('/admins', authMiddleware as any, getAdmins as any);
router.put('/profile', authMiddleware as any, updateProfile as any);

// Admin-only member pre-registration routes
router.post('/register-member', authMiddleware as any, roleMiddleware(['admin']) as any, registerMember as any);
router.get('/pre-registered-members', authMiddleware as any, roleMiddleware(['admin']) as any, getPreRegisteredMembers as any);

export default router;


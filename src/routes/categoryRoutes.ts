import { Router } from 'express';
import { getCategories } from '../controllers/categoryController';

const router = Router();

// Retrieve all categories (available to all authenticated users)
router.get('/', getCategories);

export default router;

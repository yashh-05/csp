import { Request, Response } from 'express';
import { query } from '../config/db';

/**
 * Fetch all complaint categories.
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT id, name, description FROM categories ORDER BY name ASC'
    );
    return res.status(200).json({
      success: true,
      categories: result.rows,
    });
  } catch (error: any) {
    console.error('[Category Controller - GetCategories Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories from database.',
    });
  }
};

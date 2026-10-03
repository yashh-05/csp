import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../types';

/**
 * Create a new announcement (Admin only).
 * Automatically broadcasts a notification to all registered residents.
 */
export const createAnnouncement = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
  }

  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Title and content are required.' });
  }

  try {
    // 1. Insert announcement record
    const result = await query(
      'INSERT INTO announcements (title, content, created_by) VALUES ($1, $2, $3) RETURNING id, title, content, created_at',
      [title, content, req.user.id]
    );

    // 2. Fetch all resident IDs to dispatch notifications
    const residentsResult = await query("SELECT id FROM users WHERE role = 'resident'");
    
    // 3. Batch create notifications
    const notificationsInsert = residentsResult.rows.map((resident) =>
      query(
        'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
        [
          resident.id, 
          'New Announcement', 
          `An announcement titled "${title}" has been published by administration.`
        ]
      )
    );
    
    await Promise.all(notificationsInsert);

    return res.status(201).json({
      success: true,
      message: 'Announcement published and residents notified successfully.',
      announcement: result.rows[0],
    });
  } catch (error: any) {
    console.error('[Announcement Controller - Create Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to publish announcement.',
    });
  }
};

/**
 * Retrieve all announcements (available to all logged-in residents and admins).
 */
export const getAnnouncements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT a.id, a.title, a.content, a.created_at, u.name as author_name 
       FROM announcements a 
       LEFT JOIN users u ON a.created_by = u.id 
       ORDER BY a.created_at DESC`
    );
    
    return res.status(200).json({
      success: true,
      announcements: result.rows,
    });
  } catch (error: any) {
    console.error('[Announcement Controller - Get Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve announcements.',
    });
  }
};

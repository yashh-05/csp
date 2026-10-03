import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../types';

/**
 * Get all notifications for the authenticated user (sorted by date, newest first).
 */
export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized.' });
  }

  try {
    const result = await query(
      'SELECT id, complaint_id, title, message, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.status(200).json({
      success: true,
      notifications: result.rows,
    });
  } catch (error: any) {
    console.error('[Notification Controller - GetNotifications Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications.',
    });
  }
};

/**
 * Mark a specific notification as read.
 */
export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized.' });
  }

  const { id } = req.params;

  try {
    const result = await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (error: any) {
    console.error('[Notification Controller - MarkAsRead Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification.',
    });
  }
};

/**
 * Mark all notifications for the current user as read.
 */
export const markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized.' });
  }

  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error: any) {
    console.error('[Notification Controller - MarkAllAsRead Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notifications.',
    });
  }
};

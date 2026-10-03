"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const db_1 = require("../config/db");
/**
 * Get all notifications for the authenticated user (sorted by date, newest first).
 */
const getNotifications = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized.' });
    }
    try {
        const result = await (0, db_1.query)('SELECT id, complaint_id, title, message, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        return res.status(200).json({
            success: true,
            notifications: result.rows,
        });
    }
    catch (error) {
        console.error('[Notification Controller - GetNotifications Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve notifications.',
        });
    }
};
exports.getNotifications = getNotifications;
/**
 * Mark a specific notification as read.
 */
const markAsRead = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized.' });
    }
    const { id } = req.params;
    try {
        const result = await (0, db_1.query)('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
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
    }
    catch (error) {
        console.error('[Notification Controller - MarkAsRead Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update notification.',
        });
    }
};
exports.markAsRead = markAsRead;
/**
 * Mark all notifications for the current user as read.
 */
const markAllAsRead = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized.' });
    }
    try {
        await (0, db_1.query)('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
        return res.status(200).json({
            success: true,
            message: 'All notifications marked as read.',
        });
    }
    catch (error) {
        console.error('[Notification Controller - MarkAllAsRead Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update notifications.',
        });
    }
};
exports.markAllAsRead = markAllAsRead;

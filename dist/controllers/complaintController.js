"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reRaiseComplaint = exports.updateComplaintStatus = exports.getComplaintById = exports.getComplaints = exports.createComplaint = void 0;
const db_1 = require("../config/db");
const idGenerator_1 = require("../utils/idGenerator");
const cloudinary_1 = require("../utils/cloudinary");
/**
 * File a new complaint (Residents only).
 */
const createComplaint = async (req, res) => {
    if (!req.user || req.user.role !== 'resident') {
        return res.status(403).json({ success: false, message: 'Access denied. Residents only.' });
    }
    const { title, description, categoryId, priority, houseNumber, block, floor, contactNumber } = req.body;
    if (!title || !description || !categoryId || !contactNumber || !block || !houseNumber) {
        return res.status(400).json({
            success: false,
            message: 'Title, description, categoryId, block, houseNumber, and contactNumber are required.'
        });
    }
    try {
        // 1. Generate unique complaint ID
        const complaintId = await (0, idGenerator_1.generateComplaintId)(block, houseNumber);
        // 2. Format image URL if uploaded (using Cloudinary helper)
        let imageUrl = null;
        if (req.file) {
            imageUrl = await (0, cloudinary_1.uploadToCloudinary)(req.file.path, req.file.filename);
        }
        // 3. Insert complaint
        const insertComplaintQuery = `
      INSERT INTO complaints (
        id, title, description, category_id, priority, status, 
        resident_id, house_number, block, floor, image_url, contact_number
      )
      VALUES ($1, $2, $3, $4, $5::complaint_priority, 'submitted', $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
        const parsedFloor = floor ? parseInt(floor, 10) : null;
        const complaintParams = [
            complaintId,
            title,
            description,
            categoryId,
            priority || 'medium',
            req.user.id,
            houseNumber,
            block,
            parsedFloor,
            imageUrl,
            contactNumber
        ];
        const result = await (0, db_1.query)(insertComplaintQuery, complaintParams);
        const complaint = result.rows[0];
        // 4. Log initial status transition
        await (0, db_1.query)(`INSERT INTO complaint_status_logs (complaint_id, from_status, to_status, changed_by, comment)
       VALUES ($1, NULL, 'submitted', $2, $3)`, [complaintId, req.user.id, 'Complaint registered in the system.']);
        // 5. Notify resident
        await (0, db_1.query)(`INSERT INTO notifications (user_id, complaint_id, title, message)
       VALUES ($1, $2, $3, $4)`, [
            req.user.id,
            complaintId,
            'Complaint Submitted',
            `Your complaint ${complaintId} has been successfully submitted.`
        ]);
        // 6. Notify authority admins related to this resident
        const residentProfile = await (0, db_1.query)('SELECT residential_name FROM users WHERE id = $1', [req.user.id]);
        const residentResName = residentProfile.rows[0]?.residential_name;
        let adminSql = "SELECT id FROM users WHERE role = 'admin'";
        const adminParams = [];
        if (residentResName) {
            adminSql += " AND (residential_name = $1 OR residential_name IS NULL)";
            adminParams.push(residentResName);
        }
        const admins = await (0, db_1.query)(adminSql, adminParams);
        const adminNotificationPromises = admins.rows.map((admin) => (0, db_1.query)(`INSERT INTO notifications (user_id, complaint_id, title, message)
         VALUES ($1, $2, $3, $4)`, [
            admin.id,
            complaintId,
            'New Complaint Registered',
            `A new issue (${complaintId}) has been reported at Block ${block} - ${houseNumber}.`
        ]));
        await Promise.all(adminNotificationPromises);
        return res.status(201).json({
            success: true,
            message: 'Complaint submitted successfully.',
            complaint
        });
    }
    catch (error) {
        console.error('[Complaint Controller - Create Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to register complaint.',
            error: error.message
        });
    }
};
exports.createComplaint = createComplaint;
/**
 * Retrieve complaints.
 * Residents: get their own complaints.
 * Admins: get all complaints for their authority with filtering and search.
 */
const getComplaints = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized.' });
    }
    try {
        const { status, priority, categoryId, search, block, houseNumber } = req.query;
        const isResident = req.user.role === 'resident';
        let sql = `
      SELECT c.*, cat.name as category_name, r.name as resident_name, r.phone as resident_phone, r.email as resident_email, r.residential_name as residential_name, a.name as admin_name
      FROM complaints c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users r ON c.resident_id = r.id
      LEFT JOIN users a ON c.assigned_admin_id = a.id
      WHERE 1=1
    `;
        const params = [];
        let paramIndex = 1;
        // Filter by ownership if Resident
        if (isResident) {
            sql += ` AND c.resident_id = $${paramIndex}`;
            params.push(req.user.id);
            paramIndex++;
        }
        else if (req.user.role === 'admin') {
            // Fetch admin user profile to get authority's residential_name
            const adminProfile = await (0, db_1.query)('SELECT residential_name FROM users WHERE id = $1', [req.user.id]);
            const authorityResName = adminProfile.rows[0]?.residential_name;
            if (authorityResName) {
                sql += ` AND (r.residential_name = $${paramIndex} OR r.residential_name IS NULL)`;
                params.push(authorityResName);
                paramIndex++;
            }
        }
        // Filter by Status (Admin/Resident)
        if (status) {
            sql += ` AND c.status = $${paramIndex}::complaint_status`;
            params.push(status);
            paramIndex++;
        }
        // Filter by Priority
        if (priority) {
            sql += ` AND c.priority = $${paramIndex}::complaint_priority`;
            params.push(priority);
            paramIndex++;
        }
        // Filter by Category
        if (categoryId) {
            sql += ` AND c.category_id = $${paramIndex}`;
            params.push(categoryId);
            paramIndex++;
        }
        // Filter by Block
        if (block) {
            sql += ` AND c.block ILIKE $${paramIndex}`;
            params.push(`%${block}%`);
            paramIndex++;
        }
        // Filter by House/Room Number
        if (houseNumber) {
            sql += ` AND c.house_number ILIKE $${paramIndex}`;
            params.push(`%${houseNumber}%`);
            paramIndex++;
        }
        // Search query (filters Title, Description, ID, or Resident Name)
        if (search) {
            sql += ` AND (c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex} OR c.id ILIKE $${paramIndex}`;
            if (!isResident) {
                sql += ` OR r.name ILIKE $${paramIndex}`;
            }
            sql += `)`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        sql += ' ORDER BY c.created_at DESC';
        const result = await (0, db_1.query)(sql, params);
        return res.status(200).json({
            success: true,
            complaints: result.rows
        });
    }
    catch (error) {
        console.error('[Complaint Controller - Get Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve complaints.'
        });
    }
};
exports.getComplaints = getComplaints;
/**
 * Fetch a single complaint by ID.
 * Returns detailed fields and status audit logs.
 */
const getComplaintById = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized.' });
    }
    const { id } = req.params;
    try {
        // 1. Fetch complaint
        const complaintResult = await (0, db_1.query)(`SELECT c.*, cat.name as category_name, r.name as resident_name, r.email as resident_email, a.name as admin_name
       FROM complaints c
       LEFT JOIN categories cat ON c.category_id = cat.id
       LEFT JOIN users r ON c.resident_id = r.id
       LEFT JOIN users a ON c.assigned_admin_id = a.id
       WHERE c.id = $1`, [id]);
        if (complaintResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Complaint not found.' });
        }
        const complaint = complaintResult.rows[0];
        // Enforce privacy: Residents can only view their own complaints
        if (req.user.role === 'resident' && complaint.resident_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        // 2. Fetch audit status logs
        const logsResult = await (0, db_1.query)(`SELECT l.*, u.name as changed_by_name, u.role as changed_by_role
       FROM complaint_status_logs l
       LEFT JOIN users u ON l.changed_by = u.id
       WHERE l.complaint_id = $1
       ORDER BY l.created_at ASC`, [id]);
        return res.status(200).json({
            success: true,
            complaint,
            logs: logsResult.rows
        });
    }
    catch (error) {
        console.error('[Complaint Controller - GetById Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch complaint details.'
        });
    }
};
exports.getComplaintById = getComplaintById;
/**
 * Update complaint status or assign admin (Admins only).
 */
const updateComplaintStatus = async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }
    const { id } = req.params;
    const { status, comment, assignedAdminId } = req.body;
    if (!status) {
        return res.status(400).json({ success: false, message: 'Status parameter is required.' });
    }
    try {
        // 1. Fetch current complaint state
        const checkResult = await (0, db_1.query)('SELECT status, resident_id, assigned_admin_id FROM complaints WHERE id = $1', [id]);
        if (checkResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Complaint not found.' });
        }
        const currentComplaint = checkResult.rows[0];
        const fromStatus = currentComplaint.status;
        // Upload resolution image if provided
        let resolutionImageUrl = undefined;
        if (req.file) {
            resolutionImageUrl = await (0, cloudinary_1.uploadToCloudinary)(req.file.path, req.file.filename);
        }
        // 2. Update complaint fields
        let updateQuery = `
      UPDATE complaints 
      SET status = $1::complaint_status, 
          last_status_change_at = CURRENT_TIMESTAMP
    `;
        const params = [status];
        let paramIndex = 2;
        if (assignedAdminId !== undefined) {
            updateQuery += `, assigned_admin_id = $${paramIndex}`;
            params.push(assignedAdminId || null);
            paramIndex++;
        }
        if (resolutionImageUrl !== undefined) {
            updateQuery += `, resolution_image_url = $${paramIndex}`;
            params.push(resolutionImageUrl);
            paramIndex++;
        }
        updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);
        const updateResult = await (0, db_1.query)(updateQuery, params);
        const updatedComplaint = updateResult.rows[0];
        // 3. Log status transition
        await (0, db_1.query)(`INSERT INTO complaint_status_logs (complaint_id, from_status, to_status, changed_by, comment)
       VALUES ($1, $2::complaint_status, $3::complaint_status, $4, $5)`, [id, fromStatus, status, req.user.id, comment || `Status updated from ${fromStatus} to ${status}.`]);
        // 4. Notify resident about status update
        await (0, db_1.query)(`INSERT INTO notifications (user_id, complaint_id, title, message)
       VALUES ($1, $2, $3, $4)`, [
            currentComplaint.resident_id,
            id,
            `Complaint Status: ${status.toUpperCase()}`,
            `Your complaint ${id} status has been updated to "${status}".${comment ? ` Comment: "${comment}"` : ''}`
        ]);
        // 5. Notify assigned administrator if assignedAdminId has changed
        if (assignedAdminId && assignedAdminId !== currentComplaint.assigned_admin_id) {
            await (0, db_1.query)(`INSERT INTO notifications (user_id, complaint_id, title, message)
         VALUES ($1, $2, $3, $4)`, [
                assignedAdminId,
                id,
                'Complaint Assigned to You',
                `You have been assigned to handle complaint ${id}.`
            ]);
        }
        return res.status(200).json({
            success: true,
            message: 'Complaint updated successfully.',
            complaint: updatedComplaint
        });
    }
    catch (error) {
        console.error('[Complaint Controller - UpdateStatus Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update complaint status.'
        });
    }
};
exports.updateComplaintStatus = updateComplaintStatus;
/**
 * Re-raise unresolved complaint (Residents only).
 * Escalates priority and notifies admins. Requires last activity to be > 5 days.
 */
const reRaiseComplaint = async (req, res) => {
    if (!req.user || req.user.role !== 'resident') {
        return res.status(403).json({ success: false, message: 'Access denied. Residents only.' });
    }
    const { id } = req.params;
    try {
        // 1. Fetch complaint
        const checkResult = await (0, db_1.query)(`SELECT id, priority, status, resident_id, last_status_change_at, block, house_number 
       FROM complaints WHERE id = $1`, [id]);
        if (checkResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Complaint not found.' });
        }
        const complaint = checkResult.rows[0];
        // Check ownership
        if (complaint.resident_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        // 2. Enforce 5-day age limit rule
        const lastChange = new Date(complaint.last_status_change_at).getTime();
        const now = Date.now();
        const diffDays = (now - lastChange) / (1000 * 60 * 60 * 24);
        if (diffDays < 5) {
            const remainingDays = (5 - diffDays).toFixed(1);
            return res.status(400).json({
                success: false,
                message: `You can only re-raise this complaint after 5 days of inactivity. Please wait ${remainingDays} more days.`
            });
        }
        // 3. Determine escalated priority level (Low -> Medium -> High -> Emergency)
        let nextPriority = complaint.priority;
        if (complaint.priority === 'low')
            nextPriority = 'medium';
        else if (complaint.priority === 'medium')
            nextPriority = 'high';
        else if (complaint.priority === 'high' || complaint.priority === 'emergency')
            nextPriority = 'emergency';
        // 4. Update priority, increment re-raise counter, reset last_status_change_at
        const updateResult = await (0, db_1.query)(`UPDATE complaints 
       SET priority = $1::complaint_priority,
           re_raised_count = re_raised_count + 1,
           last_status_change_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`, [nextPriority, id]);
        // 5. Log the escalation event in audit logs
        await (0, db_1.query)(`INSERT INTO complaint_status_logs (complaint_id, from_status, to_status, changed_by, comment)
       VALUES ($1, $2::complaint_status, $2::complaint_status, $3, $4)`, [
            id,
            complaint.status,
            req.user.id,
            `Complaint RE-RAISED by resident. Priority escalated from ${complaint.priority} to ${nextPriority}.`
        ]);
        // 6. Notify all admins of the escalation
        const admins = await (0, db_1.query)("SELECT id FROM users WHERE role = 'admin'");
        const adminNotifications = admins.rows.map((admin) => (0, db_1.query)(`INSERT INTO notifications (user_id, complaint_id, title, message)
         VALUES ($1, $2, $3, $4)`, [
            admin.id,
            id,
            'Complaint ESCALATED / Re-Raised',
            `Resident has re-raised issue ${id}. Priority has been increased to ${nextPriority.toUpperCase()}.`
        ]));
        await Promise.all(adminNotifications);
        // 7. Notify resident
        await (0, db_1.query)(`INSERT INTO notifications (user_id, complaint_id, title, message)
       VALUES ($1, $2, $3, $4)`, [
            req.user.id,
            id,
            'Escalation Confirmed',
            `Your complaint ${id} has been re-raised and escalated to ${nextPriority.toUpperCase()} priority.`
        ]);
        return res.status(200).json({
            success: true,
            message: 'Complaint successfully re-raised and priority escalated.',
            complaint: updateResult.rows[0]
        });
    }
    catch (error) {
        console.error('[Complaint Controller - ReRaise Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to re-raise complaint.'
        });
    }
};
exports.reRaiseComplaint = reRaiseComplaint;

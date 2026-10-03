"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPreRegistration = exports.getPreRegisteredMembers = exports.registerMember = exports.updateProfile = exports.getAdmins = exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../config/db");
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_myarea_connect_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
/**
 * Register a new user (resident or admin).
 */
const register = async (req, res) => {
    const { email, password, name, phone, houseNumber, block, floor, role, adminPasscode, residentialName } = req.body;
    const userRole = role === 'admin' ? 'admin' : 'resident';
    // Enforce removal of public resident self-registration
    if (userRole === 'resident') {
        return res.status(403).json({
            success: false,
            message: 'Resident self-registration is disabled. Resident accounts must be registered directly by your Residential Authority / Apartment Management.'
        });
    }
    // Basic validation check for Admins
    if (!email || !password || !name) {
        return res.status(400).json({
            success: false,
            message: 'Email, password, and name are required parameters.'
        });
    }
    try {
        const sanitizedEmail = email.toLowerCase().trim();
        // Enforce Residential Name for Residential Authorities
        if (!residentialName) {
            return res.status(400).json({
                success: false,
                message: 'Residential Association / Apartment Name is required for Residential Authorities.'
            });
        }
        // 1. Check if user already exists
        const checkUser = await (0, db_1.query)('SELECT id FROM users WHERE email = $1', [sanitizedEmail]);
        if (checkUser.rowCount && checkUser.rowCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'An authority user account with this email address already exists.'
            });
        }
        // 2. Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        // 3. Insert user record into the database
        const insertQuery = `
      INSERT INTO users (email, password_hash, name, phone, house_number, block, floor, residential_name, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::user_role)
      RETURNING id, email, name, role, phone, house_number, block, floor, residential_name, created_at
    `;
        const params = [
            sanitizedEmail,
            passwordHash,
            name,
            phone || null,
            houseNumber || null,
            block || null,
            floor ? parseInt(floor, 10) : null,
            residentialName,
            'admin'
        ];
        const result = await (0, db_1.query)(insertQuery, params);
        const newUser = result.rows[0];
        // 4. Generate access token
        const token = jsonwebtoken_1.default.sign({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name, residential_name: newUser.residential_name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        return res.status(201).json({
            success: true,
            message: 'Residential Authority registered successfully.',
            token,
            user: newUser
        });
    }
    catch (error) {
        console.error('[Auth Controller - Register Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to register authority user due to a server error.',
            error: error.message
        });
    }
};
exports.register = register;
/**
 * Log in an existing user.
 */
const login = async (req, res) => {
    const { email, password, name, residentialName, floor, houseNumber, block } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required parameters.'
        });
    }
    try {
        const sanitizedEmail = email.toLowerCase().trim();
        // 1. Fetch user credentials
        const result = await (0, db_1.query)('SELECT id, email, password_hash, name, role, phone, house_number, block, floor, residential_name FROM users WHERE email = $1', [sanitizedEmail]);
        if (!result.rowCount || result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Authentication Failed: No registered resident account found with this email address. Please contact your Residential Authority to register your account.'
            });
        }
        const user = result.rows[0];
        // 2. Validate password hash
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Authentication Failed: Invalid password. Please check your credentials or contact your Residential Authority.'
            });
        }
        // 3. For Residents: Enforce strict verification of registered details set by the authority
        if (user.role === 'resident') {
            const mismatches = [];
            // Check Full Name
            if (name && user.name && name.trim().toLowerCase() !== user.name.trim().toLowerCase()) {
                mismatches.push(`Full Name (Expected: "${user.name}")`);
            }
            // Check Apartment / Residential Name
            if (residentialName && user.residential_name && residentialName.trim().toLowerCase() !== user.residential_name.trim().toLowerCase()) {
                mismatches.push(`Apartment Name (Expected: "${user.residential_name}")`);
            }
            // Check Floor Number
            if (floor !== undefined && floor !== null && floor !== '' && user.floor !== null && user.floor !== undefined) {
                if (parseInt(String(floor), 10) !== parseInt(String(user.floor), 10)) {
                    mismatches.push(`Floor (Expected: ${user.floor})`);
                }
            }
            // Check House / Flat Number
            if (houseNumber && user.house_number && houseNumber.trim().toLowerCase() !== user.house_number.trim().toLowerCase()) {
                mismatches.push(`House/Flat No (Expected: "${user.house_number}")`);
            }
            // Check Block identifier (if provided)
            if (block && user.block && block.trim().toLowerCase() !== user.block.trim().toLowerCase()) {
                mismatches.push(`Block (Expected: "${user.block}")`);
            }
            if (mismatches.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Authentication Failed: The details provided do not match the registered record set by your Residential Authority. Mismatched field(s): ${mismatches.join(', ')}. Please enter the exact details registered by your authority.`
                });
            }
        }
        // 4. Generate access token
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, name: user.name, residential_name: user.residential_name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        // Strip password hash from local user instance before outputting response
        delete user.password_hash;
        return res.status(200).json({
            success: true,
            message: 'Logged in successfully.',
            token,
            user
        });
    }
    catch (error) {
        console.error('[Auth Controller - Login Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to authenticate user due to a server error.',
            error: error.message
        });
    }
};
exports.login = login;
/**
 * Get current authenticated user profile details.
 */
const getMe = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication context required.'
        });
    }
    try {
        const result = await (0, db_1.query)('SELECT id, email, name, role, phone, house_number, block, floor, residential_name, created_at FROM users WHERE id = $1', [req.user.id]);
        if (!result.rowCount || result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found.'
            });
        }
        return res.status(200).json({
            success: true,
            user: result.rows[0]
        });
    }
    catch (error) {
        console.error('[Auth Controller - GetMe Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve profile info due to a server error.'
        });
    }
};
exports.getMe = getMe;
/**
 * Retrieve all administrators in the system (for assignment mapping).
 */
const getAdmins = async (req, res) => {
    try {
        const result = await (0, db_1.query)("SELECT id, name, email, residential_name FROM users WHERE role = 'admin' ORDER BY name ASC");
        return res.status(200).json({
            success: true,
            admins: result.rows,
        });
    }
    catch (error) {
        console.error('[Auth Controller - GetAdmins Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve administrators list.',
        });
    }
};
exports.getAdmins = getAdmins;
/**
 * Update user profile details (Name, Phone, Block, HouseNumber, Floor).
 */
const updateProfile = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized.' });
    }
    const { name, phone, block, houseNumber, floor, residentialName } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: 'Name is a required field.' });
    }
    try {
        const parsedFloor = floor !== undefined && floor !== null && floor !== '' ? parseInt(floor, 10) : null;
        // Update users details
        const result = await (0, db_1.query)(`UPDATE users 
       SET name = $1, 
           phone = $2, 
           block = $3, 
           house_number = $4, 
           floor = $5,
           residential_name = COALESCE($6, residential_name),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, email, name, role, phone, house_number, block, floor, residential_name, created_at`, [
            name,
            phone || null,
            block || null,
            houseNumber || null,
            parsedFloor,
            residentialName || null,
            req.user.id
        ]);
        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully.',
            user: result.rows[0]
        });
    }
    catch (error) {
        console.error('[Auth Controller - UpdateProfile Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update profile info due to a server error.'
        });
    }
};
exports.updateProfile = updateProfile;
/**
 * Register a new resident member directly into the system (Residential Authorities / Admin only).
 */
const registerMember = async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Residential Authorities only.' });
    }
    const { email, password, name, phone, houseNumber, block, floor, residentialName } = req.body;
    // Validate mandatory fields: Name, Email, Password, Phone Number, Block, Floor, House Number
    if (!email || !password || !name || !phone || !houseNumber || !block || floor === undefined || floor === null || floor === '') {
        return res.status(400).json({
            success: false,
            message: 'All details are required: Resident Name, Email, Initial Password, Phone Number, Block, Floor, and House/Flat Number.'
        });
    }
    try {
        const sanitizedEmail = email.toLowerCase().trim();
        // Get authority's residential name
        const adminUser = await (0, db_1.query)('SELECT residential_name FROM users WHERE id = $1', [req.user.id]);
        const authorityResidentialName = residentialName || adminUser.rows[0]?.residential_name || 'General Community';
        // Check if user account with this email already exists
        const checkUser = await (0, db_1.query)('SELECT id FROM users WHERE email = $1', [sanitizedEmail]);
        if (checkUser.rowCount && checkUser.rowCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'A resident account with this email address already exists in the system.'
            });
        }
        // Hash password for resident
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const parsedFloor = parseInt(String(floor), 10);
        // Insert user record into the database as a Resident
        const insertUserQuery = `
      INSERT INTO users (email, password_hash, name, phone, house_number, block, floor, residential_name, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'resident'::user_role)
      RETURNING id, email, name, role, phone, house_number, block, floor, residential_name, created_at
    `;
        const userParams = [
            sanitizedEmail,
            passwordHash,
            name,
            phone,
            houseNumber,
            block,
            parsedFloor,
            authorityResidentialName
        ];
        const result = await (0, db_1.query)(insertUserQuery, userParams);
        const newUser = result.rows[0];
        // Record in pre_registered_members as audit log
        const checkPreReg = await (0, db_1.query)('SELECT id FROM pre_registered_members WHERE email = $1', [sanitizedEmail]);
        if (!checkPreReg.rowCount || checkPreReg.rowCount === 0) {
            await (0, db_1.query)(`INSERT INTO pre_registered_members (email, name, residential_name, house_number, block, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`, [sanitizedEmail, name, authorityResidentialName, houseNumber, block, req.user.id]);
        }
        return res.status(201).json({
            success: true,
            message: `Resident account for ${name} (${sanitizedEmail}) has been successfully created under ${authorityResidentialName}. The resident can now log in with these credentials.`,
            user: newUser
        });
    }
    catch (error) {
        console.error('[Auth Controller - RegisterMember Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to register resident member.',
            error: error.message
        });
    }
};
exports.registerMember = registerMember;
/**
 * Retrieve list of pre-registered members & total resident count for Residential Authority.
 */
const getPreRegisteredMembers = async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }
    try {
        const adminUser = await (0, db_1.query)('SELECT residential_name FROM users WHERE id = $1', [req.user.id]);
        const authorityName = adminUser.rows[0]?.residential_name;
        // Fetch registered residents count
        let countSql = "SELECT COUNT(*) as count FROM users WHERE role = 'resident'";
        const countParams = [];
        if (authorityName) {
            countSql += " AND (residential_name = $1 OR residential_name IS NULL)";
            countParams.push(authorityName);
        }
        const countRes = await (0, db_1.query)(countSql, countParams);
        const residentCount = parseInt(countRes.rows[0]?.count || '0', 10);
        // Fetch members list
        let membersSql = `
      SELECT u.id, u.email, u.name, u.phone, u.house_number, u.block, u.floor, u.residential_name, u.created_at,
             1 as is_registered
      FROM users u
      WHERE u.role = 'resident'
    `;
        const membersParams = [];
        if (authorityName) {
            membersSql += " AND (u.residential_name = $1 OR u.residential_name IS NULL)";
            membersParams.push(authorityName);
        }
        membersSql += " ORDER BY u.created_at DESC";
        const membersRes = await (0, db_1.query)(membersSql, membersParams);
        return res.status(200).json({
            success: true,
            residentCount,
            members: membersRes.rows
        });
    }
    catch (error) {
        console.error('[Auth Controller - GetPreRegisteredMembers Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch pre-registered members.'
        });
    }
};
exports.getPreRegisteredMembers = getPreRegisteredMembers;
/**
 * Check if resident email is pre-registered.
 */
const checkPreRegistration = async (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email query parameter required.' });
    }
    try {
        const sanitizedEmail = String(email).toLowerCase().trim();
        const result = await (0, db_1.query)('SELECT * FROM pre_registered_members WHERE email = $1', [sanitizedEmail]);
        if (!result.rowCount || result.rowCount === 0) {
            return res.status(200).json({
                success: true,
                isPreRegistered: false,
                message: 'Email is not pre-registered by any Residential Authority.'
            });
        }
        return res.status(200).json({
            success: true,
            isPreRegistered: true,
            record: result.rows[0]
        });
    }
    catch (error) {
        console.error('[Auth Controller - CheckPreRegistration Error]', error);
        return res.status(500).json({ success: false, message: 'Failed to check email status.' });
    }
};
exports.checkPreRegistration = checkPreRegistration;

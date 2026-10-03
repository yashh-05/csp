"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = void 0;
const db_1 = require("../config/db");
/**
 * Fetch all complaint categories.
 */
const getCategories = async (req, res) => {
    try {
        const result = await (0, db_1.query)('SELECT id, name, description FROM categories ORDER BY name ASC');
        return res.status(200).json({
            success: true,
            categories: result.rows,
        });
    }
    catch (error) {
        console.error('[Category Controller - GetCategories Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve categories from database.',
        });
    }
};
exports.getCategories = getCategories;

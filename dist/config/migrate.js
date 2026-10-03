"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
/**
 * Migration runner.
 * Reads the schema.sql file and executes it on the configured database pool.
 */
const runMigration = async () => {
    console.log('[Migration] Reading database schema file...');
    const schemaPath = path_1.default.resolve(__dirname, '../../../supabase/schema.sql');
    try {
        if (!fs_1.default.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at: ${schemaPath}`);
        }
        const sql = fs_1.default.readFileSync(schemaPath, 'utf8');
        console.log('[Migration] Connecting to database and running SQL commands...');
        // node-postgres executes multi-statement strings sequentially in one query call
        await db_1.pool.query(sql);
        console.log('[Migration] Database tables and triggers set up successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('[Migration] Fatal error running migration:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
};
runMigration();

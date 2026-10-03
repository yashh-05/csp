"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = exports.initDatabase = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
dotenv_1.default.config();
const connectionString = process.env.DATABASE_URL;
exports.pool = new pg_1.Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 3000,
});
exports.pool.on('error', (err) => {
    console.error('[Database Pool Error]', err.message);
});
let activeMode = 'unknown';
let sqliteDb = null;
let initPromise = null;
/**
 * Initializes local SQLite database as fallback when Supabase / PostgreSQL is unreachable
 */
const initSqliteDatabase = () => {
    return new Promise((resolve, reject) => {
        try {
            const dataDir = path_1.default.resolve(__dirname, '../../data');
            if (!fs_1.default.existsSync(dataDir)) {
                fs_1.default.mkdirSync(dataDir, { recursive: true });
            }
            const dbPath = path_1.default.join(dataDir, 'myarea.db');
            sqliteDb = new sqlite3_1.default.Database(dbPath, (err) => {
                if (err) {
                    console.error('[SQLite] Failed to open database file:', err);
                    return reject(err);
                }
                const createTablesSql = `
          CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              name TEXT NOT NULL,
              role TEXT NOT NULL DEFAULT 'resident',
              phone TEXT,
              house_number TEXT,
              block TEXT,
              floor INTEGER,
              residential_name TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS pre_registered_members (
              id TEXT PRIMARY KEY,
              email TEXT UNIQUE NOT NULL,
              name TEXT NOT NULL,
              residential_name TEXT NOT NULL,
              house_number TEXT NOT NULL,
              block TEXT NOT NULL,
              created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS categories (
              id TEXT PRIMARY KEY,
              name TEXT UNIQUE NOT NULL,
              description TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS complaints (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
              priority TEXT NOT NULL DEFAULT 'medium',
              status TEXT NOT NULL DEFAULT 'submitted',
              resident_id TEXT REFERENCES users(id) ON DELETE CASCADE,
              assigned_admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
              house_number TEXT NOT NULL,
              block TEXT NOT NULL,
              floor INTEGER,
              image_url TEXT,
              contact_number TEXT NOT NULL,
              re_raised_count INTEGER NOT NULL DEFAULT 0,
              last_status_change_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS complaint_status_logs (
              id TEXT PRIMARY KEY,
              complaint_id TEXT REFERENCES complaints(id) ON DELETE CASCADE NOT NULL,
              from_status TEXT,
              to_status TEXT NOT NULL,
              changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
              comment TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS notifications (
              id TEXT PRIMARY KEY,
              user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
              complaint_id TEXT REFERENCES complaints(id) ON DELETE SET NULL,
              title TEXT NOT NULL,
              message TEXT NOT NULL,
              is_read INTEGER NOT NULL DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS announcements (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              content TEXT NOT NULL,
              created_by TEXT REFERENCES users(id) ON DELETE SET NULL NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `;
                sqliteDb.exec(createTablesSql, (execErr) => {
                    if (execErr) {
                        console.error('[SQLite] Error creating schema tables:', execErr);
                        return reject(execErr);
                    }
                    // Run optional column migrations for existing database files
                    const alterMigrations = [
                        "ALTER TABLE users ADD COLUMN residential_name TEXT",
                        "ALTER TABLE pre_registered_members ADD COLUMN residential_name TEXT"
                    ];
                    let completed = 0;
                    const runNextMigration = () => {
                        if (completed >= alterMigrations.length) {
                            checkAndSeedCategories();
                            return;
                        }
                        const sql = alterMigrations[completed];
                        completed++;
                        sqliteDb.run(sql, () => {
                            // Ignore any migration error (e.g. column already exists) and continue
                            runNextMigration();
                        });
                    };
                    const checkAndSeedCategories = () => {
                        // Seed default categories if table is empty
                        sqliteDb.get('SELECT COUNT(*) as count FROM categories', (countErr, row) => {
                            if (!countErr && row && row.count === 0) {
                                const categories = [
                                    ['Electrical', 'Issues related to power cuts, meter problems, wiring, transformer issues, etc.'],
                                    ['Water', 'Issues with water supply, leakage, water meters, borewells, tankers, etc.'],
                                    ['Garbage', 'Garbage collection delay, dumpsters, waste disposal issues.'],
                                    ['Road', 'Potholes, layout roads, paving blocks, speed bumps, etc.'],
                                    ['Streetlight', 'Non-functioning streetlights, timing issues, new light installation.'],
                                    ['Security', 'Security guards, gate operations, CCTV cameras, trespassing, etc.'],
                                    ['Lift', 'Elevator breakdowns, maintenance issues, passenger stuck incidents.'],
                                    ['Parking', 'Wrongful parking, visitor parking allocation, parking spot conflicts.'],
                                    ['Gardening', 'Trimming trees, maintaining parks, watering community gardens, etc.'],
                                    ['Cleaning', 'Common area cleaning, corridor sweeping, clubhouse hygiene.'],
                                    ['Drainage', 'Sewer lines, clogged pipes, water-logging, rain water harvesting, etc.'],
                                    ['Others', 'Any other issues that do not fit standard categories.']
                                ];
                                const stmt = sqliteDb.prepare('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)');
                                categories.forEach(([name, desc]) => {
                                    stmt.run(crypto_1.default.randomUUID(), name, desc);
                                });
                                stmt.finalize();
                                console.log('[SQLite] Seeded standard complaint categories.');
                            }
                            console.log('[Database] Local SQLite database fallback ready (backend/data/myarea.db)');
                            activeMode = 'sqlite';
                            resolve();
                        });
                    };
                    runNextMigration();
                });
            });
        }
        catch (e) {
            reject(e);
        }
    });
};
/**
 * Ensures the database mode (PostgreSQL or SQLite fallback) is properly initialized
 */
const initDatabase = async () => {
    if (activeMode !== 'unknown') {
        return activeMode;
    }
    if (initPromise) {
        await initPromise;
        return activeMode;
    }
    initPromise = (async () => {
        try {
            if (connectionString) {
                console.log('[Database] Testing PostgreSQL / Supabase connection...');
                await exports.pool.query('SELECT 1');
                console.log('[Database] Successfully connected to PostgreSQL / Supabase!');
                activeMode = 'postgres';
                return;
            }
        }
        catch (err) {
            console.warn(`[Database Warning] PostgreSQL connection failed (${err.message}).`);
            console.warn('[Database] Falling back to local SQLite database mode.');
        }
        await initSqliteDatabase();
    })();
    await initPromise;
    return activeMode;
};
exports.initDatabase = initDatabase;
/**
 * Formats PostgreSQL SQL queries for SQLite execution
 */
const sanitizeSqlForSqlite = (text) => {
    let sql = text;
    // Remove PostgreSQL enum casts e.g., ::user_role, ::complaint_priority
    sql = sql.replace(/::\w+/g, '');
    // Convert PostgreSQL date functions
    sql = sql.replace(/DATE_TRUNC\('day',\s*CURRENT_TIMESTAMP\)\s*\+\s*INTERVAL\s*'1 day'/gi, "date('now', '+1 day')");
    sql = sql.replace(/DATE_TRUNC\('day',\s*CURRENT_TIMESTAMP\)/gi, "date('now')");
    sql = sql.replace(/INTERVAL\s*'5 days'/gi, "'-5 days'");
    // Handle boolean literals in SQLite (is_read = TRUE -> is_read = 1)
    sql = sql.replace(/\bis_read\s*=\s*TRUE\b/gi, 'is_read = 1');
    sql = sql.replace(/\bis_read\s*=\s*FALSE\b/gi, 'is_read = 0');
    // Check if query is INSERT into a table that needs UUID primary key auto-generated
    let autoIdRequired = false;
    let tableName;
    const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)/i);
    if (insertMatch) {
        tableName = insertMatch[1].toLowerCase();
        const columns = insertMatch[2].split(',').map(c => c.trim().toLowerCase());
        // If inserting into users, categories, complaint_status_logs, notifications, announcements, pre_registered_members without 'id'
        if (['users', 'categories', 'complaint_status_logs', 'notifications', 'announcements', 'pre_registered_members'].includes(tableName) && !columns.includes('id')) {
            autoIdRequired = true;
        }
    }
    return { sql, autoIdRequired, tableName };
};
/**
 * Universal query wrapper for executing SQL queries
 */
const query = async (text, params) => {
    const mode = await (0, exports.initDatabase)();
    if (mode === 'postgres') {
        const start = Date.now();
        const res = await exports.pool.query(text, params);
        const duration = Date.now() - start;
        if (process.env.NODE_ENV === 'development') {
            console.log('[Database Query - PostgreSQL]', {
                text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                duration: `${duration}ms`,
                rowCount: res.rowCount,
            });
        }
        return { rows: res.rows, rowCount: res.rowCount || 0 };
    }
    // SQLite Mode Execution
    return new Promise((resolve, reject) => {
        let { sql, autoIdRequired, tableName } = sanitizeSqlForSqlite(text);
        let queryParams = params ? [...params] : [];
        if (autoIdRequired && tableName) {
            // Modify INSERT statement to include id column with JS crypto UUID
            const generatedId = crypto_1.default.randomUUID();
            sql = sql.replace(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i, (match, table, cols, vals) => {
                // Shift parameter indices $1 -> $2, $2 -> $3 if placeholders are used
                const shiftedVals = vals.replace(/\$(\d+)/g, (_, num) => `$${parseInt(num, 10) + 1}`);
                return `INSERT INTO ${table} (id, ${cols}) VALUES ($1, ${shiftedVals})`;
            });
            queryParams.unshift(generatedId);
        }
        sqliteDb.all(sql, queryParams, (err, rows) => {
            if (err) {
                console.error('[SQLite Query Error]', { sql, queryParams, error: err.message });
                return reject(err);
            }
            const rowsResult = rows || [];
            if (process.env.NODE_ENV === 'development') {
                console.log('[Database Query - SQLite]', {
                    text: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
                    rowCount: rowsResult.length,
                });
            }
            resolve({ rows: rowsResult, rowCount: rowsResult.length });
        });
    });
};
exports.query = query;
// Kick off async init early
(0, exports.initDatabase)().catch(() => { });

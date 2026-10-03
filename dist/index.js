"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const errorHandler_1 = require("./middlewares/errorHandler");
const db_1 = require("./config/db");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const complaintRoutes_1 = __importDefault(require("./routes/complaintRoutes"));
const announcementRoutes_1 = __importDefault(require("./routes/announcementRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Enable Cross-Origin Resource Sharing
app.use((0, cors_1.default)());
// Parse incoming request bodies as JSON
app.use(express_1.default.json());
// Mount API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/complaints', complaintRoutes_1.default);
app.use('/api/announcements', announcementRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/categories', categoryRoutes_1.default);
// Serve uploads folder statically for complaint images
app.use('/uploads', express_1.default.static(path_1.default.resolve(__dirname, '../uploads')));
/**
 * Health check endpoint.
 * Performs a sanity check on database connectivity as well.
 */
app.get('/api/health', async (req, res) => {
    try {
        const mode = await (0, db_1.initDatabase)();
        await (0, db_1.query)('SELECT 1');
        res.status(200).json({
            success: true,
            status: 'healthy',
            database: 'connected',
            databaseMode: mode,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
// Catch-all route for unregistered endpoints (404)
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Resource not found: ${req.method} ${req.originalUrl}`
    });
});
// Global error handler (must be last middleware)
app.use(errorHandler_1.errorHandler);
// Start listening for incoming traffic
app.listen(PORT, () => {
    console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

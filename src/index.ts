import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler } from './middlewares/errorHandler';
import { query, initDatabase } from './config/db';
import authRoutes from './routes/authRoutes';
import complaintRoutes from './routes/complaintRoutes';
import announcementRoutes from './routes/announcementRoutes';
import notificationRoutes from './routes/notificationRoutes';
import categoryRoutes from './routes/categoryRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse incoming request bodies as JSON
app.use(express.json());

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/categories', categoryRoutes);

// Serve uploads folder statically for complaint images
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

/**
 * Health check endpoint.
 * Performs a sanity check on database connectivity as well.
 */
app.get('/api/health', async (req, res) => {
  try {
    const mode = await initDatabase();
    await query('SELECT 1');
    res.status(200).json({
      success: true,
      status: 'healthy',
      database: 'connected',
      databaseMode: mode,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
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
app.use(errorHandler);

// Start listening for incoming traffic
app.listen(PORT, () => {
  console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { pool } from './db.js';
import authRoutes from './routes/authRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import taskRoutes from './routes/taskRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health route
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const dbResult = await pool.query('SELECT NOW() as now');
    res.json({
      status: 'ok',
      server: 'running',
      db: 'connected',
      dbTime: dbResult.rows[0].now,
    });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      status: 'error',
      server: 'running',
      db: 'disconnected',
      error: message,
    });
  }
});

// Feature routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/tasks', taskRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

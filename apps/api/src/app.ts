import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ===== Security =====
app.use(helmet());

// ===== CORS =====
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ===== Parsing =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===== Health Check =====
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// ===== API Routes =====
import executorRoutes from './modules/executor/executor.routes';
import authRoutes from './modules/auth/auth.routes';
import collectionRoutes from './modules/collections/collection.routes';
import requestRoutes from './modules/requests/request.routes';

app.use('/api', executorRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/requests', requestRoutes);

// Future routes:
// app.use('/api/environments', environmentRoutes);
// app.use('/api/history', historyRoutes);
// app.use('/api/import', importRoutes);
// app.use('/api/ai', aiRoutes);

// ===== 404 Handler =====
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

// ===== Error Handler (must be last) =====
app.use(errorHandler);

export default app;

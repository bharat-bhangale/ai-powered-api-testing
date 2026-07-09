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
  exposedHeaders: ['X-AI-Usage-Remaining'],
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
import { executorRoutes } from './modules/executor/executor.routes';
import authRoutes from './modules/auth/auth.routes';
import collectionRoutes from './modules/collections/collection.routes';
import requestRoutes from './modules/requests/request.routes';
import environmentRoutes from './modules/environments/environment.routes';
import historyRoutes from './modules/history/history.routes';
import importRoutes from './modules/import/import.routes';
import aiRoutes from './modules/ai/ai.routes';
import testRunnerRoutes from './modules/test-runner/test-runner.routes';
import collectionRunnerRoutes from './modules/collection-runner/collection-runner.routes';
import scheduleRoutes from './modules/schedules/schedule.routes';
import schemaValidatorRoutes from './modules/schema-validator/schema-validator.routes';
import environmentMatrixRoutes from './modules/environment-matrix/environment-matrix.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import testTrendRoutes from './modules/test-runs/test-trend.routes';
import settingsRouter from './modules/settings/settings.routes';
import secretsRouter from './modules/secrets/secrets.routes';
import backupsRouter from './modules/backups/backups.routes';
import certificatesRouter from './modules/certificates/certificates.routes';
import codeGenRouter from './modules/code-gen/code-gen.routes';
import discoveryRouter from './modules/api-discovery/api-discovery.routes';
import mockServerRouter from './modules/mock-server/mock-server.routes';
import anomalyRouter from './modules/anomaly-detection/anomaly-detection.routes';
import diffRouter from './modules/api-diff/api-diff.routes';
import securityRouter from './modules/security-scanner/security-scanner.routes';
import fuzzRouter from './modules/fuzz-testing/fuzz-testing.routes';

app.use('/api', executorRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/environments', environmentRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/import', importRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/test-runner', testRunnerRoutes);
app.use('/api', collectionRunnerRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/schema-validator', schemaValidatorRoutes);
app.use('/api/environment-matrix', environmentMatrixRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/test-runs', testTrendRoutes);
app.use('/api/settings', settingsRouter);
app.use('/api/secrets', secretsRouter);
app.use('/api/backups', backupsRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/code-gen', codeGenRouter);
app.use('/api/discovery', discoveryRouter);
app.use('/api/mock-server', mockServerRouter);
app.use('/api/anomalies', anomalyRouter);
app.use('/api/diff', diffRouter);
app.use('/api/security', securityRouter);
app.use('/api/fuzz', fuzzRouter);

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

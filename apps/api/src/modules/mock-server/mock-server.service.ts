import express, { type Request, type Response, type Application } from 'express';
import http from 'http';
import cors from 'cors';
import crypto from 'crypto';
import type { MockServerConfig, MockRoute, MockResource } from '../ai/prompts/mock-generation.prompt';

// ===== Types =====

export interface MockServerStatus {
  isRunning: boolean;
  port: number | null;
  title: string;
  endpointCount: number;
  startedAt: string | null;
}

export interface MockEndpointInfo {
  method: string;
  path: string;
  url: string;
  successStatus: number;
  stateful: boolean;
  paginatable: boolean;
}

// ===== Service =====

/**
 * MockServerService — manages an in-process Express mock server.
 * Runs on a separate port from the main API (default: 3001).
 * Maintains in-memory state for stateful CRUD operations.
 * Only one mock server can be active at a time.
 */
export class MockServerService {
  private server: http.Server | null = null;
  private app: Application | null = null;
  private config: MockServerConfig | null = null;
  private dataStore: Map<string, Map<string, unknown>> = new Map();
  private startedAt: string | null = null;
  private currentPort: number | null = null;

  // ── Lifecycle ───────────────────────────────────────────────────

  async start(config: MockServerConfig, port = 3001): Promise<void> {
    if (this.server) {
      await this.stop();
    }

    this.config = config;
    this.currentPort = port;
    this.startedAt = new Date().toISOString();

    // Initialize in-memory data store from seed data
    this.dataStore = new Map();
    for (const resource of config.resources) {
      const map = new Map<string, unknown>();
      for (const item of resource.seedData) {
        const record = item as Record<string, unknown>;
        const id = String(record.id || record._id || crypto.randomUUID());
        // Ensure the record has an id field
        (record as Record<string, unknown>).id = id;
        map.set(id, record);
      }
      this.dataStore.set(resource.key, map);
    }

    // Build the Express app
    this.app = this.buildApp(config);

    // Start listening
    await new Promise<void>((resolve, reject) => {
      this.server = this.app!.listen(port, () => resolve());
      this.server.on('error', reject);
    });

    console.log(`[MockServer] Started on port ${port} with ${config.routes.length} routes`);
  }

  async stop(): Promise<void> {
    if (!this.server) return;

    await new Promise<void>((resolve) => {
      this.server!.close(() => resolve());
    });

    this.server = null;
    this.app = null;
    this.config = null;
    this.dataStore = new Map();
    this.startedAt = null;
    this.currentPort = null;

    console.log('[MockServer] Stopped');
  }

  // ── Status ──────────────────────────────────────────────────────

  getStatus(): MockServerStatus {
    return {
      isRunning: this.server !== null,
      port: this.currentPort,
      title: this.config?.title ?? '',
      endpointCount: this.config?.routes.length ?? 0,
      startedAt: this.startedAt,
    };
  }

  getEndpoints(baseUrl?: string): MockEndpointInfo[] {
    if (!this.config) return [];
    const base = baseUrl || `http://localhost:${this.currentPort}`;

    return this.config.routes.map((route) => ({
      method: route.method,
      path: route.path,
      url: `${base}${route.path}`,
      successStatus: route.successStatus,
      stateful: route.stateful,
      paginatable: route.paginatable,
    }));
  }

  // ── App Builder ─────────────────────────────────────────────────

  private buildApp(config: MockServerConfig): Application {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Global middleware: artificial delay + error injection
    app.use((req, res, next) => {
      const delayMs = parseInt(req.query._delay as string || '0', 10);
      const forceError = req.query._error as string;

      if (forceError) {
        const status = parseInt(forceError, 10) || 500;
        res.status(status).json({ error: { code: 'SIMULATED_ERROR', message: `Simulated ${status} error` } });
        return;
      }

      if (delayMs > 0 && delayMs <= 10000) {
        setTimeout(next, delayMs);
      } else {
        next();
      }
    });

    // Register all routes from config
    for (const route of config.routes) {
      this.registerRoute(app, route, config.resources);
    }

    // Health check
    app.get('/_mock/health', (_req, res) => {
      res.json({ status: 'ok', title: config.title, routes: config.routes.length });
    });

    // 404 fallback
    app.use((_req, res) => {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Mock endpoint not found' } });
    });

    return app;
  }

  private registerRoute(app: Application, route: MockRoute, resources: MockResource[]): void {
    const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';

    app[method](route.path, (req: Request, res: Response) => {
      try {
        const store = this.dataStore.get(route.resourceKey);

        if (!route.stateful || !store) {
          // Fixed response
          res.status(route.successStatus).json(route.responseTemplate ?? { message: 'ok' });
          return;
        }

        const resource = resources.find((r) => r.key === route.resourceKey);
        const id = req.params.id || req.params[Object.keys(req.params)[0] ?? ''];

        if (route.method === 'GET' && route.isCollection) {
          // List endpoint with pagination + filtering
          let items = Array.from(store.values()) as Record<string, unknown>[];

          // Apply filters from query params
          for (const field of route.filterableFields) {
            const filterVal = req.query[field] as string | undefined;
            if (filterVal) {
              items = items.filter((item) =>
                String(item[field] ?? '').toLowerCase().includes(filterVal.toLowerCase())
              );
            }
          }

          // Pagination
          const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
          const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
          const total = items.length;
          const totalPages = Math.ceil(total / limit);
          const start = (page - 1) * limit;
          const paginated = items.slice(start, start + limit);

          res.status(200).json({
            data: paginated,
            meta: { total, page, limit, totalPages },
          });
          return;
        }

        if (route.method === 'GET' && !route.isCollection) {
          // Single item
          if (!id) { res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'ID required' } }); return; }
          const item = store.get(id);
          if (!item) { res.status(404).json({ error: { code: 'NOT_FOUND', message: `${route.resourceKey} not found` } }); return; }
          res.status(200).json(item);
          return;
        }

        if (route.method === 'POST') {
          const newItem = { ...req.body, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
          store.set(newItem.id, newItem);
          res.status(201).json(newItem);
          return;
        }

        if (route.method === 'PUT' || route.method === 'PATCH') {
          if (!id) { res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'ID required' } }); return; }
          const existing = store.get(id);
          if (!existing) { res.status(404).json({ error: { code: 'NOT_FOUND', message: `${route.resourceKey} not found` } }); return; }
          const updated = route.method === 'PUT'
            ? { ...req.body, id, updatedAt: new Date().toISOString() }
            : { ...(existing as object), ...req.body, updatedAt: new Date().toISOString() };
          store.set(id, updated);
          res.status(200).json(updated);
          return;
        }

        if (route.method === 'DELETE') {
          if (!id) { res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'ID required' } }); return; }
          if (!store.has(id)) { res.status(404).json({ error: { code: 'NOT_FOUND', message: `${route.resourceKey} not found` } }); return; }
          store.delete(id);
          res.status(204).send();
          return;
        }

        // Fallback for unhandled method combos
        res.status(200).json(route.responseTemplate ?? { message: 'ok' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal mock error';
        res.status(500).json({ error: { code: 'MOCK_ERROR', message: msg } });
      }
    });
  }
}

// Singleton
export const mockServerService = new MockServerService();

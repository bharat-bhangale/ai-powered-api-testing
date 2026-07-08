import fs from 'fs';
import path from 'path';
import { isDesktopMode } from '../../config/runtime';

// ===== Types =====

export interface BaselineField {
  path: string;       // dot-notation field path e.g. "data.users[].name"
  type: string;       // "string" | "number" | "boolean" | "object" | "array" | "null"
  presence: number;   // 0-1 (1 = always present)
}

export interface EndpointBaseline {
  userId: string;
  endpointKey: string;   // "GET:/api/users"
  sampleCount: number;
  responseTime: {
    avg: number;
    stdDev: number;
    min: number;
    max: number;
    sumOfSquares: number;  // For online variance (Welford's algorithm)
  };
  responseSize: {
    avg: number;
    stdDev: number;
    sumOfSquares: number;
  };
  statusCodes: Record<string, number>;
  fields: BaselineField[];
  updatedAt: string;
}

// ===== In-memory store + optional file persistence =====

const BASELINE_FILE = path.join(process.cwd(), '.baselines.json');

class BaselineStore {
  /** key: `${userId}:${endpointKey}` */
  private store = new Map<string, EndpointBaseline>();
  private loaded = false;

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;

    if (!isDesktopMode) return; // Web mode uses DB — skip file persistence

    try {
      if (fs.existsSync(BASELINE_FILE)) {
        const raw = fs.readFileSync(BASELINE_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Record<string, EndpointBaseline>;
        for (const [key, value] of Object.entries(parsed)) {
          this.store.set(key, value);
        }
      }
    } catch {
      // Ignore — start fresh
    }
  }

  private saveAsync(): void {
    if (!isDesktopMode) return;
    const obj: Record<string, EndpointBaseline> = {};
    for (const [key, val] of this.store.entries()) {
      obj[key] = val;
    }
    fs.writeFile(BASELINE_FILE, JSON.stringify(obj, null, 2), () => {/* fire-and-forget */});
  }

  get(userId: string, endpointKey: string): EndpointBaseline | undefined {
    this.load();
    return this.store.get(`${userId}:${endpointKey}`);
  }

  set(baseline: EndpointBaseline): void {
    this.load();
    this.store.set(`${baseline.userId}:${baseline.endpointKey}`, baseline);
    this.saveAsync();
  }

  getAll(userId: string): EndpointBaseline[] {
    this.load();
    return Array.from(this.store.values()).filter((b) => b.userId === userId);
  }
}

export const baselineStore = new BaselineStore();

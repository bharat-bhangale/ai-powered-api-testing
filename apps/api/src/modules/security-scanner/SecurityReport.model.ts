import fs from 'fs';
import path from 'path';

// ===== Types =====

export type VulnSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type OwaspCategory = 'API1' | 'API2' | 'API3' | 'API4' | 'API5' | 'API7';

export interface Vulnerability {
  owaspCategory: OwaspCategory;
  endpoint: string;
  checkId: string;
  severity: VulnSeverity;
  title: string;
  description: string;
  evidence: string;
  remediation: string;
  codeExample?: string;
}

export interface SecurityReport {
  id: string;
  userId: string;
  collectionId: string;
  collectionName: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'error';
  securityScore?: number;
  endpointsScanned: number;
  checksRun: number;
  vulnerabilities: Vulnerability[];
  summary?: string;
  recommendations?: string[];
}

// ===== Scan progress event (streamed via SSE) =====

export interface ScanProgressEvent {
  type: 'progress' | 'finding' | 'complete' | 'error';
  checkId?: string;
  endpoint?: string;
  message: string;
  finding?: Vulnerability;
  report?: SecurityReport;
  progress?: number;   // 0-100
}

// ===== File-based store (mirrors Baseline pattern) =====

const REPORTS_FILE = path.join(process.cwd(), '.security-reports.json');

class SecurityReportStore {
  private reports = new Map<string, SecurityReport>();
  private loaded = false;

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (fs.existsSync(REPORTS_FILE)) {
        const raw = fs.readFileSync(REPORTS_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as SecurityReport[];
        for (const r of parsed) this.reports.set(r.id, r);
      }
    } catch { /* ignore */ }
  }

  private saveAsync(): void {
    const arr = Array.from(this.reports.values());
    fs.writeFile(REPORTS_FILE, JSON.stringify(arr, null, 2), () => {/* fire-and-forget */});
  }

  create(report: SecurityReport): SecurityReport {
    this.load();
    this.reports.set(report.id, report);
    this.saveAsync();
    return report;
  }

  update(id: string, patch: Partial<SecurityReport>): SecurityReport | null {
    this.load();
    const existing = this.reports.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    this.reports.set(id, updated);
    this.saveAsync();
    return updated;
  }

  getById(id: string): SecurityReport | null {
    this.load();
    return this.reports.get(id) ?? null;
  }

  getByUser(userId: string): SecurityReport[] {
    this.load();
    return Array.from(this.reports.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  getByCollection(userId: string, collectionId: string): SecurityReport[] {
    return this.getByUser(userId).filter((r) => r.collectionId === collectionId);
  }
}

export const securityReportStore = new SecurityReportStore();

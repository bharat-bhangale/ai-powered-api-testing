// Shared security scanner types (mirrors backend)

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

export interface ScanProgressEvent {
  type: 'init' | 'progress' | 'finding' | 'complete' | 'error';
  checkId?: string;
  endpoint?: string;
  message: string;
  finding?: Vulnerability;
  report?: SecurityReport;
  progress?: number;
  reportId?: string;
}

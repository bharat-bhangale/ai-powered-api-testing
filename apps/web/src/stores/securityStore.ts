import { create } from 'zustand';
import { toast } from 'sonner';
import type { SecurityReport, Vulnerability, ScanProgressEvent } from '@/types/security';

// ===== Store =====

type ScanState = 'idle' | 'scanning' | 'done' | 'error';

interface SecurityStore {
  state: ScanState;
  progress: number;
  progressMessage: string;
  report: SecurityReport | null;
  recentFindings: Vulnerability[];
  errorMessage: string | null;
  isPanelOpen: boolean;
  activeReportId: string | null;

  // SSE event source for aborting
  _eventSource: EventSource | null;

  // Actions
  openPanel: () => void;
  closePanel: () => void;
  reset: () => void;
  startScan: (collectionId: string, collectionName: string) => Promise<void>;
  stopScan: () => void;
}

export const useSecurityStore = create<SecurityStore>((set, get) => ({
  state: 'idle',
  progress: 0,
  progressMessage: '',
  report: null,
  recentFindings: [],
  errorMessage: null,
  isPanelOpen: false,
  activeReportId: null,
  _eventSource: null,

  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),

  reset: () => {
    get().stopScan();
    set({
      state: 'idle',
      progress: 0,
      progressMessage: '',
      report: null,
      recentFindings: [],
      errorMessage: null,
      activeReportId: null,
    });
  },

  stopScan: () => {
    const es = get()._eventSource;
    if (es) {
      es.close();
      set({ _eventSource: null, state: 'idle' });
    }
  },

  startScan: async (collectionId: string, collectionName: string) => {
    // Close any existing SSE
    get().stopScan();

    // Get collection from store to enumerate request IDs
    const { useCollectionStore } = await import('@/stores/collectionStore');
    const { apiClient } = await import('@/services/api');
    const collections = useCollectionStore.getState().collections;
    const collection = collections.find((c) => c._id === collectionId);

    if (!collection) {
      toast.error('Collection not found');
      return;
    }

    // Fetch full request data for each saved request (to get headers/body)
    const fullRequests = await Promise.all(
      collection.requests.slice(0, 15).map(async (r) => {
        try {
          const res = await apiClient.get(`/api/requests/${r._id}`);
          return res.data?.data ?? res.data;
        } catch {
          // Fall back to summary data if detail fetch fails
          return { method: r.method, url: r.url, headers: [], params: [], body: { mode: 'none', content: '' } };
        }
      })
    );

    const endpoints = fullRequests
      .filter((r) => r && r.url)
      .map((r) => ({
        method: r.method,
        url: r.url,
        headers: Object.fromEntries(
          ((r.headers ?? []) as Array<{key: string; value: string; enabled: boolean}>)
            .filter((h) => h.enabled && h.key)
            .map((h) => [h.key, h.value]),
        ),
        body: r.body?.content ?? null,
      }));

    if (endpoints.length === 0) {
      toast.error('No requests with URLs found in collection');
      return;
    }

    set({
      state: 'scanning',
      progress: 0,
      progressMessage: 'Connecting…',
      report: null,
      recentFindings: [],
      errorMessage: null,
    });

    try {
      // Use fetch to get the SSE connection going via POST
      const token = localStorage.getItem('atx-token') ?? '';
      const response = await fetch('/api/security/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ collectionId, collectionName, endpoints }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start scan');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as ScanProgressEvent & { reportId?: string };

            if (event.type === 'init' && event.reportId) {
              set({ activeReportId: event.reportId });
            } else if (event.type === 'progress') {
              set({
                progress: event.progress ?? get().progress,
                progressMessage: event.message,
              });
            } else if (event.type === 'finding' && event.finding) {
              set((s) => ({ recentFindings: [...s.recentFindings, event.finding!] }));
              toast.warning(`⚠️ ${event.finding.title}`, { duration: 3000 });
            } else if (event.type === 'complete' && event.report) {
              set({ state: 'done', report: event.report, progress: 100 });
              const vulnCount = event.report.vulnerabilities?.length ?? 0;
              if (vulnCount === 0) {
                toast.success('Security scan complete — no vulnerabilities found! 🎉');
              } else {
                toast.error(`Security scan complete — ${vulnCount} vulnerability${vulnCount !== 1 ? 'ies' : 'y'} found`);
              }
            } else if (event.type === 'error') {
              set({ state: 'error', errorMessage: event.message });
              toast.error(`Scan error: ${event.message}`);
            }
          } catch { /* skip malformed line */ }
        }
      }
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Scan failed';
      set({ state: 'error', errorMessage: msg });
      toast.error(msg);
    }
  },
}));

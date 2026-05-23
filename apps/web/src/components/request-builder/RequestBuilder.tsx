import { useState, useCallback, useEffect } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { useRequestStore } from '@/stores/requestStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { apiClient } from '@/services/api';
import { RequestTabs } from './RequestTabs';
import { UrlBar } from './UrlBar';
import { RequestPanel } from './RequestPanel';
import { SaveModal } from './SaveModal';
import { ResponseViewer } from '@/components/response-viewer/ResponseViewer';
import styles from './RequestBuilder.module.css';

/**
 * Main request builder — the core UI of the application.
 * Composes: Tabs → URL Bar (with Save) → Request Panel → Response Viewer
 */
export const RequestBuilder = () => {
  const {
    tabs,
    activeTabId,
    updateMethod,
    updateUrl,
    updateHeaders,
    updateParams,
    updateBody,
    updateAuth,
    setLoading,
    setResponse,
    markSaved,
  } = useRequestStore();

  const { fetchCollections } = useCollectionStore();
  const [showSaveModal, setShowSaveModal] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Execute request
  const handleSend = useCallback(async () => {
    if (!activeTab || !activeTab.url.trim()) return;

    setLoading(activeTab.id, true);

    try {
      const res = await apiClient.post('/api/execute', {
        method: activeTab.method,
        url: activeTab.url,
        headers: activeTab.headers,
        params: activeTab.params,
        body: activeTab.body,
      });
      setResponse(activeTab.id, res.data.data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Request failed';
      toast.error(message);
      setResponse(activeTab.id, {
        success: false,
        request: {
          resolvedUrl: activeTab.url,
          resolvedHeaders: {},
          resolvedBody: null,
        },
        response: {
          status: 0,
          statusText: 'Error',
          headers: {},
          body: null,
          size: 0,
          timing: { total: 0 },
        },
        error: { code: 'CLIENT_ERROR', message },
        executedAt: new Date().toISOString(),
      });
    }
  }, [activeTab, setLoading, setResponse]);

  // Save request (Ctrl+S shortcut)
  const handleSave = useCallback(async () => {
    if (!activeTab) return;

    if (activeTab.savedRequestId) {
      // Already saved — update in place
      try {
        await apiClient.patch(`/api/requests/${activeTab.savedRequestId}`, {
          name: activeTab.name,
          method: activeTab.method,
          url: activeTab.url,
          headers: activeTab.headers.filter((h) => h.key),
          params: activeTab.params.filter((p) => p.key),
          body: activeTab.body,
          auth: activeTab.auth,
        });
        markSaved(activeTab.id, activeTab.savedRequestId, activeTab.savedCollectionId!);
        await fetchCollections();
        toast.success('Request updated');
      } catch {
        toast.error('Failed to update request');
      }
    } else {
      // New request — show save modal
      setShowSaveModal(true);
    }
  }, [activeTab, markSaved, fetchCollections]);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  if (!activeTab) return null;

  return (
    <div className={styles.builder}>
      {/* Tab bar */}
      <RequestTabs />

      {/* Request section */}
      <div className={styles.workspace}>
        <div className={styles.requestSection}>
          {/* URL Bar with Save button */}
          <div className={styles.urlSection}>
            <UrlBar
              method={activeTab.method}
              url={activeTab.url}
              isLoading={activeTab.isLoading}
              onMethodChange={updateMethod}
              onUrlChange={updateUrl}
              onSend={handleSend}
            />
            <button
              className={styles.saveButton}
              onClick={handleSave}
              title="Save (Ctrl+S)"
              type="button"
            >
              <Save size={16} />
              {activeTab.isDirty && <span className={styles.dirtyDot} />}
            </button>
          </div>

          {/* Request Panel (Params, Headers, Body, Auth) */}
          <div className={styles.panelSection}>
            <RequestPanel
              params={activeTab.params}
              headers={activeTab.headers}
              body={activeTab.body}
              auth={activeTab.auth}
              onParamsChange={updateParams}
              onHeadersChange={updateHeaders}
              onBodyChange={updateBody}
              onAuthChange={updateAuth}
            />
          </div>
        </div>

        {/* Response section */}
        <div className={styles.responseSection}>
          <ResponseViewer
            response={activeTab.response}
            isLoading={activeTab.isLoading}
          />
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <SaveModal onClose={() => setShowSaveModal(false)} />
      )}
    </div>
  );
};

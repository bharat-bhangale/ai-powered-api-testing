import { useState, useCallback, useEffect } from 'react';
import { Save, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useRequestStore } from '@/stores/requestStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { useEnvironmentStore } from '@/stores/environmentStore';
import { useTestRunnerStore } from '@/stores/testRunnerStore';
import { apiClient } from '@/services/api';
import { executeRequest as executeRequestService } from '@/services/executor.service';
import { RequestTabs } from './RequestTabs';
import { UrlBar } from './UrlBar';
import { RequestPanel } from './RequestPanel';
import { SaveModal } from './SaveModal';
import { CodeGenerationModal } from './CodeGenerationModal';
import { ResponseViewer } from '@/components/response-viewer/ResponseViewer';
import { TestResultsPanel } from '@/components/test-runner/TestResultsPanel';
import { useAutoTest } from '@/hooks/useAutoTest';
import { generateCurl } from '@/utils/curl-generator';
import { NLRequestBar } from '@/components/ai/NLRequestBar';
import { NLRequestPreview } from '@/components/ai/NLRequestPreview';
import { useNLRequest } from '@/hooks/useNLRequest';
import { TestBuilderChat } from '@/components/ai/TestBuilderChat';
import { RequestOptimizer } from '@/components/ai/RequestOptimizer';
import { useRequestOptimizer } from '@/hooks/useRequestOptimizer';
import { useAnomalyStore } from '@/stores/anomalyStore';
import styles from './RequestBuilder.module.css';

/**
 * Main request builder — the core UI of the application.
 * Composes: Tabs → URL Bar (with Save) → Request Panel → Response Viewer → Test Results
 */
export const RequestBuilder = () => {
  // Hook: watches for new responses and triggers AI auto-testing
  useAutoTest();
  const nlRequest = useNLRequest();
  const optimizer = useRequestOptimizer();

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
  const [showCodeGenModal, setShowCodeGenModal] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Execute request
  const handleSend = useCallback(async () => {
    if (!activeTab || !activeTab.url.trim()) return;

    setLoading(activeTab.id, true);

    // Auto-prepend https:// if no protocol specified
    let requestUrl = activeTab.url.trim();
    if (requestUrl && !requestUrl.match(/^https?:\/\//i)) {
      requestUrl = `https://${requestUrl}`;
      updateUrl(requestUrl);
    }

    try {
      const result = await executeRequestService({
        method: activeTab.method,
        url: requestUrl,
        headers: activeTab.headers,
        params: activeTab.params,
        body: activeTab.body,
        auth: activeTab.auth,
        environmentId: useEnvironmentStore.getState().activeEnvironmentId,
      });
      setResponse(activeTab.id, result);

      // Anomaly detection — fire-and-forget (non-blocking)
      if (result.success && result.response.status > 0) {
        useAnomalyStore.getState().analyzeResponse({
          method: activeTab.method,
          url: requestUrl,
          status: result.response.status,
          responseTimeMs: result.response.timing.total,
          responseSizeBytes: result.response.size,
          responseBody: result.response.body,
        });
      } else {
        useAnomalyStore.getState().reset();
      }

      // Auto-run test script if one exists (non-blocking)
      const testScript = useTestRunnerStore.getState().getScript(activeTab.id);
      if (testScript?.trim()) {
        useTestRunnerStore.getState().runTests(activeTab.id);
      }
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
          testScript: useTestRunnerStore.getState().getScript(activeTab.id),
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

  // Copy as cURL
  const handleCopyCurl = useCallback(() => {
    if (!activeTab) return;
    const curl = generateCurl({
      method: activeTab.method,
      url: activeTab.url,
      headers: activeTab.headers,
      params: activeTab.params,
      body: activeTab.body,
      auth: activeTab.auth,
    });
    navigator.clipboard.writeText(curl).then(() => {
      toast.success('cURL copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  }, [activeTab]);

  // Ctrl+S and Ctrl+Shift+C shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        handleCopyCurl();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        nlRequest.toggleExpanded();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handleCopyCurl, nlRequest]);

  if (!activeTab) return null;

  return (
    <div className={styles.builder}>
      {/* Tab bar */}
      <RequestTabs />

      {/* Request section */}
      <div className={styles.workspace}>
        <div className={styles.requestSection}>
          <NLRequestBar
            isExpanded={nlRequest.isExpanded}
            isGenerating={nlRequest.isGenerating}
            onToggle={nlRequest.toggleExpanded}
            onGenerate={nlRequest.generate}
          />
          {/* URL Bar with Save button */}
          <div className={styles.urlSection}>
            <UrlBar
              method={activeTab.method}
              url={activeTab.url}
              isLoading={activeTab.isLoading}
              onMethodChange={updateMethod}
              onUrlChange={updateUrl}
              onSend={handleSend}
              canOptimize={optimizer.canAnalyze}
              isOptimizing={optimizer.isAnalyzing}
              optimizerCount={optimizer.count}
              optimizerSeverity={optimizer.maxSeverity}
              onOptimize={optimizer.trigger}
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
            <button
              className={styles.saveButton}
              onClick={handleCopyCurl}
              title="Copy as cURL (Ctrl+Shift+C)"
              type="button"
            >
              <Copy size={15} />
            </button>
            <button
              className={styles.saveButton}
              onClick={() => setShowCodeGenModal(true)}
              title="Generate Code"
              type="button"
            >
              <span>{'</>'}</span>
            </button>
          </div>

          {/* Request Panel (Params, Headers, Body, Auth, Tests) */}
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
          <TestResultsPanel />
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <SaveModal onClose={() => setShowSaveModal(false)} />
      )}

      {/* Code Gen Modal */}
      {showCodeGenModal && (
        <CodeGenerationModal 
          request={{
            method: activeTab.method,
            url: activeTab.url,
            headers: activeTab.headers,
            params: activeTab.params,
            body: activeTab.body,
            auth: activeTab.auth
          }}
          onClose={() => setShowCodeGenModal(false)} 
        />
      )}

      {/* AI Request Preview (NL→Request) */}
      {nlRequest.generatedRequest && (
        <NLRequestPreview
          request={nlRequest.generatedRequest}
          onAccept={nlRequest.acceptRequest}
          onDiscard={nlRequest.discardRequest}
        />
      )}

      {/* AI Test Builder Chat Drawer */}
      <TestBuilderChat />

      {/* AI Request Optimizer Panel */}
      <RequestOptimizer 
        isOpen={optimizer.isPanelOpen} 
        onClose={optimizer.closePanel} 
      />
    </div>
  );
};

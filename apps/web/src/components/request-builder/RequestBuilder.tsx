import { toast } from 'sonner';
import { useRequestStore } from '@/stores/requestStore';
import { executeRequest } from '@/services/executor.service';
import { RequestTabs } from './RequestTabs';
import { UrlBar } from './UrlBar';
import { RequestPanel } from './RequestPanel';
import { ResponseViewer } from '@/components/response-viewer/ResponseViewer';
import styles from './RequestBuilder.module.css';

/**
 * Main request builder — the core UI of the application.
 * Composes: Tabs → URL Bar → Request Panel → Response Viewer
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
  } = useRequestStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) return null;

  const handleSend = async () => {
    if (!activeTab.url.trim()) return;

    setLoading(activeTab.id, true);

    try {
      const result = await executeRequest({
        method: activeTab.method,
        url: activeTab.url,
        headers: activeTab.headers,
        params: activeTab.params,
        body: activeTab.body,
      });
      setResponse(activeTab.id, result);
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
  };

  return (
    <div className={styles.builder}>
      {/* Tab bar */}
      <RequestTabs />

      {/* Request section */}
      <div className={styles.workspace}>
        <div className={styles.requestSection}>
          {/* URL Bar */}
          <div className={styles.urlSection}>
            <UrlBar
              method={activeTab.method}
              url={activeTab.url}
              isLoading={activeTab.isLoading}
              onMethodChange={updateMethod}
              onUrlChange={updateUrl}
              onSend={handleSend}
            />
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
    </div>
  );
};

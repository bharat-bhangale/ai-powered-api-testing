import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import { useRequestStore } from '@/stores/requestStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { useEnvironmentStore } from '@/stores/environmentStore';
import { useAIStore } from '@/stores/aiStore';
import type { HttpMethod, KeyValuePair, RequestBodyConfig, AuthConfig } from '@/stores/requestStore';

// ===== Types =====

export interface GeneratedRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers: Array<{ key: string; value: string }>;
  queryParams: Array<{ key: string; value: string }>;
  body: string;
  bodyType: 'none' | 'json' | 'form-data';
  authSuggestion: 'none' | 'bearer' | 'api-key' | 'basic';
  explanation: string;
}

interface UseNLRequestReturn {
  /** Is the AI currently generating a request? */
  isGenerating: boolean;
  /** The generated request waiting for user approval */
  generatedRequest: GeneratedRequest | null;
  /** Whether the NL bar is expanded */
  isExpanded: boolean;
  /** Toggle the NL bar open/closed */
  toggleExpanded: () => void;
  /** Submit natural language text to the AI */
  generate: (text: string) => Promise<void>;
  /** Accept the generated request — populates the request builder */
  acceptRequest: () => void;
  /** Discard the generated request preview */
  discardRequest: () => void;
}

/**
 * useNLRequest — manages the Natural Language → API Request flow.
 *
 * Flow: user types → generate() → AI produces GeneratedRequest →
 *       show preview → user clicks Accept → acceptRequest() populates builder
 */
export function useNLRequest(): UseNLRequestReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRequest, setGeneratedRequest] = useState<GeneratedRequest | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const { setUsage } = useAIStore();

  const generate = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setIsGenerating(true);

    try {
      // Build collection context from the current collection store state
      const collectionState = useCollectionStore.getState();
      const activeTabId = useRequestStore.getState().activeTabId;
      const activeTab = useRequestStore.getState().tabs.find((t) => t.id === activeTabId);

      // Get up to 20 method+URL pairs from the active collection (or all collections)
      const allRequests: Array<{ method: string; url: string }> = [];
      let inferredBaseUrl: string | undefined;

      for (const collection of collectionState.collections) {
        for (const req of collection.requests) {
          if (allRequests.length < 20) {
            allRequests.push({ method: req.method, url: req.url });
            // Try to infer base URL from the first https URL
            if (!inferredBaseUrl && req.url.startsWith('http')) {
              try {
                const parsed = new URL(req.url);
                inferredBaseUrl = `${parsed.protocol}//${parsed.host}`;
              } catch {
                // ignore invalid URLs
              }
            }
          }
        }
      }

      // Also consider the current tab URL if it has a value
      if (!inferredBaseUrl && activeTab?.url.startsWith('http')) {
        try {
          const parsed = new URL(activeTab.url);
          inferredBaseUrl = `${parsed.protocol}//${parsed.host}`;
        } catch {
          // ignore
        }
      }

      // Get environment variable NAMES only (never values — security)
      const variableNames = useEnvironmentStore.getState().getVariableNames();

      const res = await apiClient.post('/api/ai/nl-to-request', {
        naturalLanguage: trimmed.substring(0, 500),
        collectionContext: {
          requests: allRequests,
          baseUrl: inferredBaseUrl,
        },
        environmentVariables: variableNames,
      });

      // Update AI usage indicator
      const remaining = res.headers['x-ai-usage-remaining'];
      if (remaining != null) {
        const used = 50 - Number(remaining);
        setUsage({ used, limit: 50, remaining: Number(remaining) });
      }

      const generated: GeneratedRequest = res.data.data;
      setGeneratedRequest(generated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate request';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }, [setUsage]);

  const acceptRequest = useCallback(() => {
    if (!generatedRequest) return;

    const store = useRequestStore.getState();
    const activeTabId = store.activeTabId;
    if (!activeTabId) return;

    // Build KeyValuePair arrays from AI output
    const makeKV = (items: Array<{ key: string; value: string }>): KeyValuePair[] => {
      const pairs: KeyValuePair[] = items
        .filter((item) => item.key.trim())
        .map((item) => ({
          id: crypto.randomUUID(),
          key: item.key,
          value: item.value,
          description: '',
          enabled: true,
        }));
      // Always append one blank row
      pairs.push({ id: crypto.randomUUID(), key: '', value: '', description: '', enabled: true });
      return pairs;
    };

    // Build body config
    const body: RequestBodyConfig = {
      mode: generatedRequest.bodyType === 'json' ? 'json' : generatedRequest.bodyType === 'form-data' ? 'form-data' : 'none',
      content: generatedRequest.body || '',
    };

    // Build auth config from suggestion
    let auth: AuthConfig = { type: 'none' };
    if (generatedRequest.authSuggestion === 'bearer') {
      auth = { type: 'bearer', bearer: { token: '{{auth_token}}' } };
    } else if (generatedRequest.authSuggestion === 'api-key') {
      auth = { type: 'apikey', apiKey: { key: 'X-API-Key', value: '{{api_key}}', addTo: 'header' } };
    } else if (generatedRequest.authSuggestion === 'basic') {
      auth = { type: 'basic', basic: { username: '{{username}}', password: '{{password}}' } };
    }

    const config: any = {
      method: generatedRequest.method as HttpMethod,
      url: generatedRequest.url,
      headers: makeKV(generatedRequest.headers),
      params: makeKV(generatedRequest.queryParams),
      body,
    };

    // Apply auth if a suggestion was made
    if (generatedRequest.authSuggestion !== 'none') {
      config.auth = auth;
    }

    store.populateFromAI(config);

    toast.success('Request populated from AI ✨');
    setGeneratedRequest(null);
  }, [generatedRequest]);

  const discardRequest = useCallback(() => {
    setGeneratedRequest(null);
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return {
    isGenerating,
    generatedRequest,
    isExpanded,
    toggleExpanded,
    generate,
    acceptRequest,
    discardRequest,
  };
}

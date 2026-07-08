import { create } from 'zustand';

// ===== Types =====

export interface TestBuilderMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;             // AI reply text (markdown)
  questions?: string[];        // Follow-up questions from AI
  isComplete?: boolean;        // AI says suite is done
  timestamp: number;
}

export interface GeneratedConvTest {
  name: string;
  category: 'status' | 'body_structure' | 'data_validation' | 'performance' | 'edge_case' | 'auth' | 'security';
  script: string;
}

// ===== Store Interface =====

interface TestBuilderStore {
  /** Full conversation — keyed per active tab ID */
  conversationsByTab: Record<string, TestBuilderMessage[]>;
  /** Latest accumulated test list — keyed per tab ID */
  testsByTab: Record<string, GeneratedConvTest[]>;
  /** Whether the chat panel is open */
  isPanelOpen: boolean;
  /** Is waiting for AI response */
  isThinking: boolean;

  // Actions
  addMessage: (tabId: string, msg: Omit<TestBuilderMessage, 'id' | 'timestamp'>) => void;
  setTests: (tabId: string, tests: GeneratedConvTest[]) => void;
  clearConversation: (tabId: string) => void;
  clearAll: () => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setThinking: (thinking: boolean) => void;

  // Selectors (as methods so they can use fresh state)
  getConversation: (tabId: string) => TestBuilderMessage[];
  getTests: (tabId: string) => GeneratedConvTest[];
  getConversationForAPI: (tabId: string) => Array<{ role: 'user' | 'assistant'; content: string }>;
  getCompositeScript: (tabId: string) => string;
}

// ===== Store =====

/**
 * TestBuilderStore — manages the per-tab state for the AI Conversational
 * Test Builder. Scoped to memory only; not persisted to DB.
 *
 * Conversation and tests are keyed per tab ID so switching tabs
 * cleanly isolates the test-building session to the active request.
 */
export const useTestBuilderStore = create<TestBuilderStore>((set, get) => ({
  conversationsByTab: {},
  testsByTab: {},
  isPanelOpen: false,
  isThinking: false,

  addMessage: (tabId, msg) => {
    const id = crypto.randomUUID();
    set((state) => {
      const existing = state.conversationsByTab[tabId] || [];
      return {
        conversationsByTab: {
          ...state.conversationsByTab,
          [tabId]: [...existing, { ...msg, id, timestamp: Date.now() }],
        },
      };
    });
  },

  setTests: (tabId, tests) => {
    set((state) => ({
      testsByTab: { ...state.testsByTab, [tabId]: tests },
    }));
  },

  clearConversation: (tabId) => {
    set((state) => {
      const { [tabId]: _c, ...restConv } = state.conversationsByTab;
      const { [tabId]: _t, ...restTests } = state.testsByTab;
      return { conversationsByTab: restConv, testsByTab: restTests };
    });
  },

  clearAll: () => set({ conversationsByTab: {}, testsByTab: {} }),

  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
  setThinking: (thinking) => set({ isThinking: thinking }),

  getConversation: (tabId) => get().conversationsByTab[tabId] || [],

  getTests: (tabId) => get().testsByTab[tabId] || [],

  /** Trim to 20 messages for API (to keep tokens bounded) */
  getConversationForAPI: (tabId) => {
    const msgs = get().conversationsByTab[tabId] || [];
    return msgs
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));
  },

  /** Build a composite runnable script from all tests (dedup by name) */
  getCompositeScript: (tabId) => {
    const tests = get().testsByTab[tabId] || [];
    const deduped = new Map<string, GeneratedConvTest>();
    for (const t of tests) deduped.set(t.name, t);
    return Array.from(deduped.values())
      .map((t) => t.script)
      .join('\n\n');
  },
}));

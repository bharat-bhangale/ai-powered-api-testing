import { create } from 'zustand';

// ===== Types =====

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AIUsage {
  used: number;
  limit: number;
  remaining: number;
}

interface AIStore {
  // Chat state
  messages: ChatMessage[];
  isStreaming: boolean;
  isPanelOpen: boolean;

  // Usage state
  usage: AIUsage;

  // Test generation state
  isGeneratingTests: boolean;

  // Debug state
  isDebugging: boolean;

  // Actions
  addMessage: (role: 'user' | 'assistant', content: string) => string;
  appendToLastMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  togglePanel: () => void;
  openPanel: () => void;
  clearMessages: () => void;
  setUsage: (usage: AIUsage) => void;
  setGeneratingTests: (generating: boolean) => void;
  setDebugging: (debugging: boolean) => void;
}

/**
 * AI Store — manages chat messages, streaming state, panel visibility,
 * usage tracking, and loading states for test generation/debugging.
 */
export const useAIStore = create<AIStore>((set) => ({
  messages: [],
  isStreaming: false,
  isPanelOpen: false,
  usage: { used: 0, limit: 50, remaining: 50 },
  isGeneratingTests: false,
  isDebugging: false,

  addMessage: (role, content) => {
    const id = crypto.randomUUID();
    set((state) => ({
      messages: [...state.messages, { id, role, content, timestamp: Date.now() }],
    }));
    return id;
  },

  appendToLastMessage: (content) => {
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = { ...last, content: last.content + content };
      }
      return { messages };
    });
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  openPanel: () => set({ isPanelOpen: true }),
  clearMessages: () => set({ messages: [] }),
  setUsage: (usage) => set({ usage }),
  setGeneratingTests: (generating) => set({ isGeneratingTests: generating }),
  setDebugging: (debugging) => set({ isDebugging: debugging }),
}));

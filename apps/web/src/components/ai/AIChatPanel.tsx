import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Sparkles, Send, Trash2, Zap, Bug, TestTube } from 'lucide-react';
import { useAIStore, type ChatMessage } from '@/stores/aiStore';
import { useRequestStore } from '@/stores/requestStore';
import { useAuthStore } from '@/stores/authStore';
import styles from './AIChatPanel.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * AIChatPanel — persistent sidebar chat panel (360px).
 * Streams AI responses token-by-token via SSE.
 * Context-aware: automatically includes current request/response.
 */
export const AIChatPanel = () => {
  const {
    messages,
    isStreaming,
    isPanelOpen,
    addMessage,
    appendToLastMessage,
    setStreaming,
    togglePanel,
    clearMessages,
    setUsage,
  } = useAIStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isPanelOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isPanelOpen]);

  /** Get current tab context for the AI */
  const getContext = useCallback(() => {
    const store = useRequestStore.getState();
    const tab = store.tabs.find((t) => t.id === store.activeTabId);
    if (!tab) return undefined;

    return {
      currentRequest: { method: tab.method, url: tab.url },
      currentResponse: tab.response
        ? { status: tab.response.response.status, body: tab.response.response.body }
        : undefined,
    };
  }, []);

  /** Send message via SSE streaming */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      addMessage('user', text.trim());
      addMessage('assistant', '');
      setStreaming(true);
      setInput('');

      try {
        const token = useAuthStore.getState().accessToken;
        const response = await fetch(`${API_URL}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: text.trim(),
            context: getContext(),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n').filter((l) => l.startsWith('data: '));

            for (const line of lines) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  appendToLastMessage(data.content);
                }
                if (data.usage) {
                  setUsage(data.usage);
                }
              } catch {
                // Skip malformed SSE chunks
              }
            }
          }
        }
      } catch (err) {
        appendToLastMessage(`\n\n⚠️ Error: ${err instanceof Error ? err.message : 'Failed to get AI response'}`);
      } finally {
        setStreaming(false);
      }
    },
    [isStreaming, addMessage, appendToLastMessage, setStreaming, setUsage, getContext],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  if (!isPanelOpen) return null;

  return (
    <aside className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Sparkles size={16} className={styles.sparkle} />
          <h3 className={styles.title}>AI Assistant</h3>
        </div>
        <div className={styles.headerActions}>
          {messages.length > 0 && (
            <button className={styles.iconBtn} onClick={clearMessages} title="Clear chat" type="button">
              <Trash2 size={14} />
            </button>
          )}
          <button className={styles.iconBtn} onClick={togglePanel} title="Close" type="button">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.welcome}>
            <Sparkles size={28} className={styles.welcomeIcon} />
            <p className={styles.welcomeTitle}>How can I help?</p>
            <p className={styles.welcomeHint}>
              Ask me about your API requests, responses, errors, or testing strategies.
            </p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        {isStreaming && (
          <div className={styles.streamingIndicator}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className={styles.quickActions}>
          <button
            className={styles.quickBtn}
            onClick={() => handleQuickAction('Explain this API response in detail')}
            type="button"
          >
            <Zap size={12} /> Explain response
          </button>
          <button
            className={styles.quickBtn}
            onClick={() => handleQuickAction('Suggest test assertions for this response')}
            type="button"
          >
            <TestTube size={12} /> Suggest tests
          </button>
          <button
            className={styles.quickBtn}
            onClick={() => handleQuickAction('Debug this error and suggest fixes')}
            type="button"
          >
            <Bug size={12} /> Debug error
          </button>
        </div>
      )}

      {/* Input */}
      <form className={styles.inputBar} onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isStreaming ? 'AI is thinking...' : 'Ask anything about APIs...'}
          disabled={isStreaming}
          spellCheck={false}
        />
        <button
          className={styles.sendBtn}
          type="submit"
          disabled={isStreaming || !input.trim()}
          title="Send"
        >
          <Send size={14} />
        </button>
      </form>
    </aside>
  );
};

/** Individual message bubble */
const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
      <div className={styles.bubbleContent}>{message.content || '...'}</div>
    </div>
  );
};

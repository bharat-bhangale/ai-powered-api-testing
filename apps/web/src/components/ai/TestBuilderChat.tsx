import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Sparkles, Send, Trash2, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import { useTestBuilderStore, type TestBuilderMessage } from '@/stores/testBuilderStore';
import { useRequestStore } from '@/stores/requestStore';
import { useAIStore } from '@/stores/aiStore';
import { TestBuilderPreview } from './TestBuilderPreview';
import styles from './TestBuilderChat.module.css';

// ===== Quick starter prompts =====

const QUICK_STARTERS = [
  'Test that the response structure is correct and all required fields are present',
  'Add security tests: check for sensitive data exposure and proper error handling',
  'Add performance tests and edge case handling for error responses',
  'Build a comprehensive suite covering status codes, auth, and data validation',
];

// Stable empty array — used as selector fallback to prevent infinite re-renders
const EMPTY_CONVERSATION: TestBuilderMessage[] = [];

// ===== Main Component =====

/**
 * TestBuilderChat — slide-in drawer panel with a split-pane layout:
 *  Left:  Multi-turn chat with the QA-engineer AI persona
 *  Right: Live preview of the composite test script being built
 *
 * Scoped per-tab: switching to a different tab clears/restores the session.
 */
export const TestBuilderChat = () => {
  const isPanelOpen = useTestBuilderStore((s) => s.isPanelOpen);
  const isThinking = useTestBuilderStore((s) => s.isThinking);
  const { closePanel, addMessage, setTests, clearConversation, setThinking } = useTestBuilderStore.getState();
  const { setUsage } = useAIStore.getState();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Reactive reads — will re-render when tabId or conversation changes
  const activeTabId = useRequestStore((s) => s.activeTabId) ?? '';

  // Direct stable selector — avoids getConversation() which returns a new []
  // literal as fallback, causing Zustand's snapshot check to always detect a
  // change and trigger an infinite re-render loop.
  const conversation = useTestBuilderStore(
    (s) => s.conversationsByTab[activeTabId] ?? EMPTY_CONVERSATION,
  );

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, isThinking]);

  // Reset isComplete when switching tabs
  useEffect(() => {
    setIsComplete(false);
  }, [activeTabId]);

  // Focus textarea when opened
  useEffect(() => {
    if (isPanelOpen) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [isPanelOpen]);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    if (isPanelOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPanelOpen, closePanel]);

  /** Build request context from the active tab */
  const getRequestContext = useCallback(() => {
    const store = useRequestStore.getState();
    const tab = store.tabs.find((t) => t.id === store.activeTabId);
    if (!tab) return { method: 'GET', url: '' };

    const ctx: Record<string, unknown> = {
      method: tab.method,
      url: tab.url,
    };

    if (tab.response) {
      ctx.response = {
        status: tab.response.response.status,
        statusText: tab.response.response.statusText,
        body: tab.response.response.body,
        timing: tab.response.response.timing,
      };
    }

    return ctx;
  }, []);

  /** Send a message to the conversational test builder */
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    const tabId = useRequestStore.getState().activeTabId ?? '';
    const store = useTestBuilderStore.getState();

    // Add user message
    addMessage(tabId, { role: 'user', content: trimmed });
    setInput('');
    setThinking(true);

    try {
      const conversationHistory = store.getConversationForAPI(tabId);
      const existingScript = store.getCompositeScript(tabId);

      const res = await apiClient.post('/api/ai/test-builder/message', {
        message: trimmed,
        conversationHistory,
        requestContext: getRequestContext(),
        existingTestScript: existingScript,
      });

      const data = res.data.data;

      // Update usage
      const remaining = res.headers['x-ai-usage-remaining'];
      if (remaining != null) {
        const used = 50 - Number(remaining);
        setUsage({ used, limit: 50, remaining: Number(remaining) });
      }

      // Add AI response to conversation
      addMessage(tabId, {
        role: 'assistant',
        content: data.reply,
        questions: data.questions || [],
        isComplete: data.isComplete,
      });

      // Update the live test preview
      if (data.generatedTests?.length > 0) {
        setTests(tabId, data.generatedTests);
      }

      // Track completion state
      if (data.isComplete) {
        setIsComplete(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI test builder failed';
      toast.error(msg);
      addMessage(tabId, {
        role: 'assistant',
        content: `⚠️ Error: ${msg}`,
      });
    } finally {
      setThinking(false);
    }
  }, [isThinking, addMessage, setThinking, getRequestContext, setTests, setUsage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleClear = useCallback(() => {
    const tabId = useRequestStore.getState().activeTabId ?? '';
    clearConversation(tabId);
    setIsComplete(false);
  }, [clearConversation]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closePanel();
  };

  if (!isPanelOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Sparkles size={18} className={styles.sparkleGradient} />
            <div>
              <h3 className={styles.headerTitle}>AI Test Builder</h3>
              <div className={styles.headerSubtitle}>Describe scenarios · AI generates runnable tests</div>
            </div>
          </div>
          <div className={styles.headerActions}>
            {conversation.length > 0 && (
              <button className={styles.iconBtn} onClick={handleClear} title="Clear conversation" type="button">
                <Trash2 size={15} />
              </button>
            )}
            <button className={styles.iconBtn} onClick={closePanel} title="Close (Esc)" type="button">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Split body */}
        <div className={styles.body}>
          
          {/* Left: Chat */}
          <div className={styles.chatSide}>
            <div className={styles.messages}>
              {conversation.length === 0 ? (
                <WelcomeState onStarter={(s) => sendMessage(s)} />
              ) : (
                conversation.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onQuestionClick={(q) => sendMessage(q)}
                  />
                ))
              )}

              {isThinking && (
                <div className={styles.thinkingIndicator}>
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className={styles.inputBar} onSubmit={handleSubmit}>
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={isThinking ? 'AI is building your tests...' : 'Describe what you want to test... (Enter to send)'}
                disabled={isThinking}
                rows={1}
              />
              <button
                className={styles.sendBtn}
                type="submit"
                disabled={isThinking || !input.trim()}
                title="Send"
              >
                <Send size={15} />
              </button>
            </form>
          </div>

          {/* Right: Preview */}
          <div className={styles.previewSide}>
            <TestBuilderPreview tabId={activeTabId} isComplete={isComplete} />
          </div>

        </div>
      </div>
    </div>
  );
};

// ===== Sub-components =====

const WelcomeState = ({ onStarter }: { onStarter: (s: string) => void }) => (
  <div className={styles.welcome}>
    <div className={styles.welcomeIconWrap}>
      <TestTube size={26} color="white" />
    </div>
    <p className={styles.welcomeTitle}>AI Test Builder</p>
    <p className={styles.welcomeHint}>
      Describe test scenarios in plain English and I'll build complete,
      runnable <strong>atx.test()</strong> scripts through conversation.
    </p>
    <div className={styles.quickStarters}>
      {QUICK_STARTERS.map((s, i) => (
        <button key={i} className={styles.starterBtn} onClick={() => onStarter(s)} type="button">
          {s}
        </button>
      ))}
    </div>
  </div>
);

const MessageBubble = ({
  message,
  onQuestionClick,
}: {
  message: TestBuilderMessage;
  onQuestionClick: (q: string) => void;
}) => {
  const isUser = message.role === 'user';

  return (
    <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
      <div className={styles.bubbleContent}>{message.content || '...'}</div>

      {/* Follow-up questions as clickable chips */}
      {!isUser && message.questions && message.questions.length > 0 && (
        <div className={styles.questions}>
          {message.questions.map((q, i) => (
            <button
              key={i}
              className={styles.questionItem}
              onClick={() => onQuestionClick(q)}
              type="button"
            >
              ❓ {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

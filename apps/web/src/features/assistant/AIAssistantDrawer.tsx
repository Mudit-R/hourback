import React, { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { ASK_AI_ASSISTANT } from '../../graphql/operations';
import styles from './AIAssistantDrawer.module.css';

interface AIAssistantDrawerProps {
  classId: string;
  onClose: () => void;
}

interface AIResponseData {
  askAIAssistant: {
    reply: string;
    suggestions: string[];
  };
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ classId, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<
    { role: 'user' | 'assistant'; text: string; suggestions?: string[] }[]
  >([
    {
      role: 'assistant',
      text: 'Hello! I am your **Toddle AI Teaching Partner**. I have full context on your classroom rubrics, student observations, and report progress. What would you like to explore today?',
      suggestions: [
        'Summarize class progress for parent-teacher conferences',
        'Identify students needing targeted intervention in Criterion B',
        'Suggest differentiated fraction tasks for Grade 5',
      ],
    },
  ]);

  const [askAI, { loading }] = useLazyQuery<AIResponseData>(ASK_AI_ASSISTANT, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.askAIAssistant) {
        setHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.askAIAssistant.reply,
            suggestions: data.askAIAssistant.suggestions,
          },
        ]);
      }
    },
  });

  const handleSubmit = (queryText: string) => {
    const text = queryText.trim();
    if (!text) return;

    setHistory((prev) => [...prev, { role: 'user', text }]);
    setPrompt('');
    void askAI({ variables: { classId, prompt: text } });
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div className={styles.headerTitle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span>Toddle AI Teaching Partner</span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.chatBody}>
          {history.map((msg, i) => (
            <div
              key={i}
              className={styles.messageCard}
              style={{
                background: msg.role === 'user' ? '#eff6ff' : '#ffffff',
                borderColor: msg.role === 'user' ? '#bfdbfe' : 'var(--color-border)',
              }}
            >
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className={styles.suggestionsSection}>
                  <span className={styles.quickPromptsLabel}>Recommended Follow-ups:</span>
                  {msg.suggestions.map((s, si) => (
                    <button
                      key={si}
                      type="button"
                      className={styles.suggestionPill}
                      onClick={() => handleSubmit(s)}
                    >
                      → {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className={styles.messageCard} style={{ color: 'var(--color-text-muted)' }}>
              Analyzing class criteria and generating pedagogical guidance...
            </div>
          )}
        </div>

        <form
          className={styles.footerInput}
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(prompt);
          }}
        >
          <input
            type="text"
            className={styles.textInput}
            placeholder="Ask AI partner about your class..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button type="submit" className={styles.sendBtn} disabled={loading || !prompt.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

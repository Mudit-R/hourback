import React, { useState } from 'react';
import styles from './GenerateButton.module.css';

interface GenerateButtonProps {
  onGenerate: (tone: string, length: string) => void;
  generating: boolean;
  studentCount: number;
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({
  onGenerate,
  generating,
  studentCount,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [tone, setTone] = useState<'warm' | 'formal' | 'encouraging'>('warm');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(tone, length);
    setModalOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={styles.btnPrimary}
        onClick={() => setModalOpen(true)}
        disabled={generating || studentCount === 0}
        aria-haspopup="dialog"
        id="btn-generate-comments"
      >
        {generating ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            <span>Enqueuing...</span>
          </>
        ) : (
          <>
            <span className={styles.icon} aria-hidden="true">✨</span>
            <span>Generate All ({studentCount})</span>
          </>
        )}
      </button>

      {modalOpen && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-generate-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 id="modal-generate-title" className={styles.modalTitle}>
                Batch Comment Generation
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setModalOpen(false)}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <p className={styles.modalDescription}>
              Generate grounded, citation-backed draft comments for all{' '}
              <strong>{studentCount} students</strong>. Student names are automatically
              anonymized before sending to the model and re-hydrated locally.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Comment Tone</label>
                <div className={styles.optionsGrid} role="radiogroup" aria-label="Tone selection">
                  {(['warm', 'formal', 'encouraging'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={tone === t}
                      className={`${styles.optionBtn} ${tone === t ? styles.optionSelected : ''}`}
                      onClick={() => setTone(t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Target Length</label>
                <div className={styles.optionsGrid} role="radiogroup" aria-label="Length selection">
                  {[
                    { id: 'short', label: 'Short', desc: '1–3 sent.' },
                    { id: 'medium', label: 'Medium', desc: '2–5 sent.' },
                    { id: 'long', label: 'Detailed', desc: '4–8 sent.' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      role="radio"
                      aria-checked={length === l.id}
                      className={`${styles.optionBtn} ${length === l.id ? styles.optionSelected : ''}`}
                      onClick={() => setLength(l.id as 'short' | 'medium' | 'long')}
                    >
                      {l.label} <span style={{ opacity: 0.7, fontSize: 11 }}>({l.desc})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  id="confirm-generate-batch"
                >
                  Launch Generation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

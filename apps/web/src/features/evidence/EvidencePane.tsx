import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_STUDENT_EVIDENCE, ADD_OBSERVATION } from '../../graphql/operations';
import styles from './EvidencePane.module.css';

interface Criterion {
  id: string;
  name: string;
  maxLevel: number;
  description: string | null;
}

interface AssessmentResult {
  id: string;
  level: number;
  feedback: string | null;
  criterion: Criterion;
}

interface Observation {
  id: string;
  text: string;
  tag: string | null;
  createdAt: string;
}

interface StudentEvidenceData {
  studentEvidence: {
    assessmentResults: AssessmentResult[];
    observations: Observation[];
  };
}

interface EvidencePaneProps {
  studentId: string;
  studentName?: string;
  highlightedEvidenceIds?: string[];
}

export const EvidencePane: React.FC<EvidencePaneProps> = ({
  studentId,
  studentName,
  highlightedEvidenceIds = [],
}) => {
  const [activeTag, setActiveTag] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [obsText, setObsText] = useState('');
  const [obsTag, setObsTag] = useState('mathematics');

  const { data, loading, error, refetch } = useQuery<StudentEvidenceData>(GET_STUDENT_EVIDENCE, {
    variables: { studentId },
    skip: !studentId,
  });

  const [addObservation, { loading: adding }] = useMutation(ADD_OBSERVATION, {
    onCompleted: () => {
      setObsText('');
      setModalOpen(false);
      void refetch();
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obsText.trim()) return;
    void addObservation({
      variables: {
        studentId,
        text: obsText.trim(),
        tag: obsTag,
      },
    });
  };

  const results = data?.studentEvidence.assessmentResults ?? [];
  const observations = data?.studentEvidence.observations ?? [];

  const filteredObs =
    activeTag === 'all'
      ? observations
      : observations.filter((o) => o.tag?.toLowerCase() === activeTag.toLowerCase());

  const totalCount = results.length + observations.length;

  return (
    <div className={styles.container} id="evidence-pane">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.title}>
            <span>Evidence Pack</span>
            <span className={styles.badge}>{totalCount} items</span>
          </div>
          <span className={styles.subtitle}>
            {studentName ? `Grounded data for ${studentName}` : 'Select a student to inspect evidence'}
          </span>
        </div>

        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setModalOpen(true)}
          id="btn-add-observation"
        >
          <span>+</span>
          <span>Add Note</span>
        </button>
      </div>

      {loading ? (
        <div className={styles.empty}>Loading student evidence...</div>
      ) : error ? (
        <div className={styles.empty}>Error loading evidence: {error.message}</div>
      ) : (
        <div className={styles.content}>
          {/* Assessment Criteria Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>
                Criteria Assessment Results ({results.length})
              </span>
            </div>

            <div className={styles.cardList}>
              {results.map((ar) => {
                const isHighlighted = highlightedEvidenceIds.includes(ar.id);
                return (
                  <div
                    key={ar.id}
                    id={`evidence-${ar.id}`}
                    className={`${styles.card} ${isHighlighted ? styles.cardHighlighted : ''}`}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.criterionName}>{ar.criterion.name}</span>
                      <div className={styles.levelIndicator}>
                        <span className={styles.levelBadge}>
                          L{ar.level}/{ar.criterion.maxLevel}
                        </span>
                        <div className={styles.levelPips} aria-hidden="true">
                          {Array.from({ length: ar.criterion.maxLevel }, (_, i) => (
                            <span
                              key={i}
                              className={`${styles.pip} ${i < ar.level ? styles.pipFilled : ''}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {ar.feedback && <p className={styles.cardFeedback}>{ar.feedback}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observations Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>
                Observations & Anecdotals ({observations.length})
              </span>
              <div className={styles.tagFilterGroup}>
                {['all', 'mathematics', 'collaboration', 'writing', 'inquiry'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`${styles.tagPill} ${activeTag === tag ? styles.tagPillActive : ''}`}
                    onClick={() => setActiveTag(tag)}
                  >
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.cardList}>
              {filteredObs.length === 0 ? (
                <div className={styles.empty}>No observations found for this tag.</div>
              ) : (
                filteredObs.map((obs) => {
                  const isHighlighted = highlightedEvidenceIds.includes(obs.id);
                  return (
                    <div
                      key={obs.id}
                      id={`evidence-${obs.id}`}
                      className={`${styles.card} ${isHighlighted ? styles.cardHighlighted : ''}`}
                    >
                      <div className={styles.observationTop}>
                        <span className={styles.observationTag}>{obs.tag ?? 'general'}</span>
                        <span className={styles.observationDate}>
                          {new Date(obs.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className={styles.observationText}>{obs.text}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Observation Modal */}
      {modalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-obs-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className={styles.modal}>
            <h3 id="modal-add-obs-title" style={{ fontSize: 16, fontWeight: 700 }}>
              Add Teacher Observation
            </h3>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea
                className={styles.textarea}
                placeholder="Enter objective, criteria-linked observation about student progress..."
                value={obsText}
                onChange={(e) => setObsText(e.target.value)}
                required
                autoFocus
                id="input-observation-text"
              />

              <select
                className={styles.select}
                value={obsTag}
                onChange={(e) => setObsTag(e.target.value)}
                id="select-observation-tag"
              >
                <option value="mathematics">Mathematics</option>
                <option value="collaboration">Collaboration</option>
                <option value="writing">Writing & Literacy</option>
                <option value="inquiry">Inquiry & Research</option>
                <option value="general">General Learning Habit</option>
              </select>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.addBtn}
                  style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}
                  disabled={adding || !obsText.trim()}
                  id="submit-observation"
                >
                  {adding ? 'Saving...' : 'Save Observation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

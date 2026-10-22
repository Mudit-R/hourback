import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CLASS_GRADEBOOK, ADD_OBSERVATION } from '../../graphql/operations';
import styles from './PortfoliosView.module.css';

interface PortfoliosViewProps {
  classId: string;
  periodId: string;
}

interface Observation {
  id: string;
  text: string;
  tag: string | null;
  createdAt: string;
}

interface StudentItem {
  id: string;
  name: string;
  preferredName: string | null;
  evidence: {
    observations: Observation[];
  };
}

export const PortfoliosView: React.FC<PortfoliosViewProps> = ({ classId, periodId }) => {
  const [activeTag, setActiveTag] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newTag, setNewTag] = useState('mathematics');
  const [newText, setNewText] = useState('');

  const { data, loading, error, refetch } = useQuery<{ classRoster: StudentItem[] }>(
    GET_CLASS_GRADEBOOK,
    {
      variables: { classId, periodId },
      fetchPolicy: 'cache-and-network',
    },
  );

  const [addObservation, { loading: adding }] = useMutation(ADD_OBSERVATION, {
    onCompleted: () => {
      setModalOpen(false);
      setNewText('');
      void refetch();
    },
  });

  if (loading && !data) {
    return <div style={{ padding: 32, color: 'var(--color-text-muted)' }}>Loading classroom portfolios...</div>;
  }

  if (error) {
    return <div style={{ padding: 32, color: 'var(--color-error)' }}>Error loading portfolios: {error.message}</div>;
  }

  const students = data?.classRoster ?? [];

  // Flatten all observations with student metadata
  const allObservations = students.flatMap((s) =>
    s.evidence.observations.map((o) => ({
      ...o,
      studentId: s.id,
      studentName: s.name,
      preferredName: s.preferredName ?? s.name,
    })),
  );

  // Sort descending by date
  allObservations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const tags = ['all', 'mathematics', 'collaboration', 'writing', 'inquiry'];
  const filteredObservations =
    activeTag === 'all'
      ? allObservations
      : allObservations.filter((o) => (o.tag ?? '').toLowerCase() === activeTag.toLowerCase());

  const handleCreateObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId || !newText.trim()) return;
    void addObservation({
      variables: {
        studentId: newStudentId,
        text: newText.trim(),
        tag: newTag,
      },
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <h2>Student Portfolios & Evidence Feed</h2>
          <p className={styles.subtitle}>
            Live qualitative classroom observations tagged by learning dimension and cited by the AI generator.
          </p>
        </div>

        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => {
            if (students.length > 0 && !newStudentId) {
              setNewStudentId(students[0]!.id);
            }
            setModalOpen(true);
          }}
        >
          + Capture Observation
        </button>
      </div>

      <div className={styles.filterBar}>
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.tagPill} ${activeTag === t ? styles.tagPillActive : ''}`}
            onClick={() => setActiveTag(t)}
          >
            {t} ({t === 'all' ? allObservations.length : allObservations.filter((o) => (o.tag ?? '').toLowerCase() === t).length})
          </button>
        ))}
      </div>

      <div className={styles.feedWrapper}>
        {filteredObservations.map((obs) => (
          <div key={obs.id} className={styles.obsCard}>
            <div className={styles.cardHeader}>
              <div className={styles.studentInfo}>
                <div className={styles.avatar}>{obs.preferredName.charAt(0)}</div>
                <span className={styles.studentName}>{obs.studentName}</span>
                {obs.tag && <span className={styles.badge}>{obs.tag}</span>}
              </div>

              <span className={styles.timestamp}>
                {new Date(obs.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <p className={styles.obsText}>{obs.text}</p>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Capture Classroom Observation</h3>

            <form onSubmit={handleCreateObservation} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Student</label>
                <select
                  className={styles.formSelect}
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Learning Dimension / Tag</label>
                <select
                  className={styles.formSelect}
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                >
                  <option value="mathematics">Mathematics (ATL)</option>
                  <option value="collaboration">Collaboration & Social Skills</option>
                  <option value="writing">Writing & Communication</option>
                  <option value="inquiry">Inquiry & Thinking Skills</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Observation Note</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="Record what the student demonstrated (e.g., 'Independently applied the area model to solve word problems...')"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={adding}
                >
                  {adding ? 'Saving...' : 'Add to Evidence Pack'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

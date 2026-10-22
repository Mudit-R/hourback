import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { MUTATION_REGISTER_STUDENT } from '../../graphql/authOperations';
import { GET_CLASS_ROSTER } from '../../graphql/operations';
import styles from './AddStudentModal.module.css';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  periodId: string;
  onStudentRegistered?: (studentId: string) => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  classId,
  periodId,
  onStudentRegistered,
}) => {
  const [name, setName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [registerStudentMutation] = useMutation(MUTATION_REGISTER_STUDENT, {
    refetchQueries: [
      {
        query: GET_CLASS_ROSTER,
        variables: { classId, periodId },
      },
    ],
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await registerStudentMutation({
        variables: {
          classId,
          name: name.trim(),
          preferredName: preferredName.trim() || null,
        },
      });

      const student = res.data?.registerStudent;
      if (student?.id) {
        onStudentRegistered?.(student.id);
        setName('');
        setPreferredName('');
        onClose();
      }
    } catch (err) {
      console.error('Failed to register student:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Enroll Student to Roster</h2>
          <p className={styles.subtitle}>
            Provisions student records, assessment criteria entries, and portfolio feed
          </p>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Full Legal Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Maya Lin Robertson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <span className={styles.helpText}>Formal name for official report cards and transcripts</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Preferred Classroom Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Maya (optional)"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
            />
            <span className={styles.helpText}>Used for personalized narrative comments</span>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={submitting || !name.trim()}>
              {submitting ? 'Enrolling...' : 'Enroll Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

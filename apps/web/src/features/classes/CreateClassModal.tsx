import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { MUTATION_CREATE_CLASS } from '../../graphql/authOperations';
import { GET_TEACHER_CLASSES } from '../../graphql/operations';
import styles from './CreateClassModal.module.css';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClassCreated: (classId: string) => void;
}

export const CreateClassModal: React.FC<CreateClassModalProps> = ({
  isOpen,
  onClose,
  onClassCreated,
}) => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('Grade 5');
  const [subject, setSubject] = useState('Mathematics');
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [submitting, setSubmitting] = useState(false);

  const [createClassMutation] = useMutation(MUTATION_CREATE_CLASS, {
    refetchQueries: [{ query: GET_TEACHER_CLASSES }],
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await createClassMutation({
        variables: {
          name: name.trim(),
          grade,
          subject,
          academicYear,
        },
      });

      const newClass = res.data?.createClass;
      if (newClass?.id) {
        onClassCreated(newClass.id);
        onClose();
        setName('');
      }
    } catch (err) {
      console.error('Failed to register class:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Register New Classroom</h2>
          <p className={styles.subtitle}>
            Initialize gradebook criteria, portfolios, and reporting periods
          </p>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Class Identifier</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Grade 5C — Integrated Science"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <span className={styles.helpText}>Display name shown on report cards and transcripts</span>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Grade Level</label>
              <select className={styles.select} value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Subject Domain</label>
              <select className={styles.select} value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="Mathematics">Mathematics</option>
                <option value="English Language Arts">English Language Arts</option>
                <option value="Integrated Science">Integrated Science</option>
                <option value="Social Studies">Social Studies</option>
                <option value="Visual Arts">Visual Arts</option>
                <option value="Physical Education">Physical Education</option>
                <option value="Inquiry Unit">Inquiry Unit</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Academic Year</label>
            <input
              type="text"
              className={styles.input}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              required
            />
          </div>

          <div className={styles.infoBox}>
            <strong>Automated Curriculum Provisioning:</strong> Registering this class provisions standard IB/MYP assessment criteria (Bands 1–8), initializes Semester 1 reporting periods, and connects to the Toddle AI Assistant.
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={submitting || !name.trim()}>
              {submitting ? 'Registering...' : 'Register Classroom'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

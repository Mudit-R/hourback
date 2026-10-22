import React, { useCallback, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { List, AutoSizer } from 'react-virtualized';
import { useDispatch, useSelector } from 'react-redux';
import { GET_CLASS_ROSTER, GENERATE_COMMENTS } from '../../graphql/operations';
import { selectStudent, setActiveJob } from '../../store/uiSlice';
import type { RootState } from '../../store';
import { StatusChip } from '../../components/StatusChip';
import { GenerateButton } from '../jobs/GenerateButton';
import { AddStudentModal } from './AddStudentModal';
import { ImportCsvModal } from './ImportCsvModal';
import styles from './ClassRoster.module.css';

interface Student {
  id: string;
  name: string;
  preferredName: string | null;
  reportComment: {
    id: string;
    status: string;
    groundednessScore: number | null;
  } | null;
}

interface ClassRosterProps {
  classId: string;
  periodId: string;
}

const ROW_HEIGHT = 64;

export const ClassRoster: React.FC<ClassRosterProps> = ({ classId, periodId }) => {
  const dispatch = useDispatch();
  const selectedId = useSelector((s: RootState) => s.ui.selectedStudentId);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [importCsvOpen, setImportCsvOpen] = useState(false);

  const { data, loading, error } = useQuery<{ classRoster: Student[] }>(GET_CLASS_ROSTER, {
    variables: { classId, periodId },
    pollInterval: 5000, // refresh every 5s to catch completed comments
  });

  const [generateComments, { loading: generating }] = useMutation(GENERATE_COMMENTS, {
    onCompleted: (d: { generateComments: { id: string } }) => {
      dispatch(setActiveJob(d.generateComments.id));
    },
  });

  const students = data?.classRoster ?? [];
  const approvedCount = students.filter((s) => s.reportComment?.status === 'approved').length;
  const draftCount = students.filter((s) => s.reportComment?.status === 'draft').length;
  const pendingCount = students.filter((s) => !s.reportComment).length;

  const handleGenerate = useCallback(
    (tone: string, length: string) => {
      void generateComments({ variables: { classId, periodId, tone, length } });
    },
    [classId, periodId, generateComments],
  );

  const rowRenderer = useCallback(
    ({ index, key, style }: { index: number; key: string; style: React.CSSProperties }) => {
      const student = students[index];
      if (!student) return null;

      const isSelected = student.id === selectedId;
      const status = student.reportComment?.status ?? 'pending';

      return (
        <div
          key={key}
          style={style}
          className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
          role="button"
          tabIndex={0}
          aria-pressed={isSelected}
          aria-label={`${student.preferredName ?? student.name}, status: ${status}`}
          id={`student-row-${student.id}`}
          onClick={() => dispatch(selectStudent(student.id))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              dispatch(selectStudent(student.id));
            }
          }}
        >
          <div className={styles.avatar} aria-hidden="true">
            {(student.preferredName ?? student.name).charAt(0).toUpperCase()}
          </div>
          <div className={styles.info}>
            <span className={styles.name}>{student.preferredName ?? student.name}</span>
            <span className={styles.fullName}>{student.name}</span>
          </div>
          <StatusChip status={status as 'draft' | 'edited' | 'approved' | 'flagged' | 'pending'} />
        </div>
      );
    },
    [students, selectedId, dispatch],
  );

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} aria-busy="true" aria-label="Loading roster..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container} role="alert">
        <p className={styles.error}>Failed to load roster: {error.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Class Roster</h1>
          <p className={styles.subtitle} aria-live="polite">
            {approvedCount} approved · {draftCount} drafted · {pendingCount} pending
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.addStudentBtn}
            onClick={() => setAddStudentOpen(true)}
            title="Enroll a new student to this class"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Student</span>
          </button>
          <button
            type="button"
            className={styles.addStudentBtn}
            onClick={() => setImportCsvOpen(true)}
            title="Upload roster and evidence from CSV or spreadsheet"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Import CSV</span>
          </button>
          <GenerateButton
            onGenerate={handleGenerate}
            generating={generating}
            studentCount={students.length}
          />
        </div>
      </div>

      {/* Progress bar */}
      {students.length > 0 && (
        <div className={styles.progressBar} role="progressbar"
          aria-valuenow={approvedCount}
          aria-valuemin={0}
          aria-valuemax={students.length}
          aria-label={`${approvedCount} of ${students.length} comments approved`}
        >
          <div
            className={styles.progressFill}
            style={{ width: `${(approvedCount / students.length) * 100}%` }}
          />
        </div>
      )}

      {/* Virtualized list */}
      {students.length === 0 ? (
        <div className={styles.empty}>
          <p>No students in this class.</p>
        </div>
      ) : (
        <div className={styles.listWrapper}>
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                rowCount={students.length}
                rowHeight={ROW_HEIGHT}
                rowRenderer={rowRenderer}
                overscanRowCount={5}
                aria-label="Student roster"
                role="list"
              />
            )}
          </AutoSizer>
        </div>
      )}

      {/* Enroll Student Modal */}
      <AddStudentModal
        isOpen={addStudentOpen}
        onClose={() => setAddStudentOpen(false)}
        classId={classId}
        periodId={periodId}
        onStudentRegistered={(studentId) => dispatch(selectStudent(studentId))}
      />

      {/* Bulk Import CSV Modal */}
      <ImportCsvModal
        isOpen={importCsvOpen}
        onClose={() => setImportCsvOpen(false)}
        classId={classId}
        periodId={periodId}
      />
    </div>
  );
};

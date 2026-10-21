import React, { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery } from '@apollo/client';
import { Header } from './components/Header';
import { ClassRoster } from './features/roster/ClassRoster';
import { CommentEditor } from './features/commentEditor/CommentEditor';
import { EvidencePane } from './features/evidence/EvidencePane';
import { JobProgressBanner } from './features/jobs/JobProgressBanner';
import { TimeSavedSummaryCard } from './features/analytics/TimeSavedSummaryCard';
import { selectStudent } from './store/uiSlice';
import type { RootState } from './store';
import { GET_CLASS_ROSTER } from './graphql/operations';
import styles from './App.module.css';

interface StudentRosterItem {
  id: string;
  name: string;
  preferredName: string | null;
}

export const App: React.FC = () => {
  const dispatch = useDispatch();
  const { selectedClassId, selectedPeriodId, selectedStudentId } = useSelector(
    (s: RootState) => s.ui,
  );

  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [highlightedEvidenceIds, setHighlightedEvidenceIds] = useState<string[]>([]);

  // Query roster to find current student name and support "next student" advancement
  const { data: rosterData } = useQuery<{ classRoster: StudentRosterItem[] }>(GET_CLASS_ROSTER, {
    variables: { classId: selectedClassId, periodId: selectedPeriodId },
    skip: !selectedClassId || !selectedPeriodId,
  });

  const students = rosterData?.classRoster ?? [];
  const currentStudent = students.find((s) => s.id === selectedStudentId);

  const handleNextStudent = useCallback(() => {
    if (!students.length) return;
    const currentIndex = students.findIndex((s) => s.id === selectedStudentId);
    if (currentIndex >= 0 && currentIndex < students.length - 1) {
      dispatch(selectStudent(students[currentIndex + 1]!.id));
    }
  }, [students, selectedStudentId, dispatch]);

  const handleHoverEvidence = useCallback((evidenceIds: string[]) => {
    setHighlightedEvidenceIds(evidenceIds);
  }, []);

  return (
    <div className={styles.appContainer}>
      <Header
        onToggleAnalytics={() => setAnalyticsOpen((prev) => !prev)}
        analyticsOpen={analyticsOpen}
      />

      <JobProgressBanner />

      {analyticsOpen && selectedClassId && selectedPeriodId && (
        <div className={styles.analyticsDrawer}>
          <TimeSavedSummaryCard classId={selectedClassId} periodId={selectedPeriodId} />
        </div>
      )}

      <main className={styles.mainLayout}>
        {/* Left Column: Virtualized Class Roster */}
        <section className={styles.rosterPane} aria-label="Student Roster">
          {selectedClassId && selectedPeriodId ? (
            <ClassRoster classId={selectedClassId} periodId={selectedPeriodId} />
          ) : (
            <div style={{ padding: 24, color: 'var(--color-text-muted)' }}>
              Loading classes...
            </div>
          )}
        </section>

        {/* Center / Right Column: SplitPane Editor or Welcome Empty State */}
        <section className={styles.detailArea} aria-label="Comment Editor & Evidence">
          {selectedStudentId && selectedPeriodId && selectedClassId ? (
            <div className={styles.splitEditorArea}>
              <div className={styles.commentColumn}>
                <CommentEditor
                  studentId={selectedStudentId}
                  periodId={selectedPeriodId}
                  classId={selectedClassId}
                  studentName={currentStudent?.preferredName ?? currentStudent?.name}
                  onHoverEvidence={handleHoverEvidence}
                  onNextStudent={handleNextStudent}
                />
              </div>

              <div className={styles.evidenceColumn}>
                <EvidencePane
                  studentId={selectedStudentId}
                  studentName={currentStudent?.preferredName ?? currentStudent?.name}
                  highlightedEvidenceIds={highlightedEvidenceIds}
                />
              </div>
            </div>
          ) : (
            <div className={styles.emptySelection} id="empty-roster-selection">
              <div className={styles.emptySelectionIcon} aria-hidden="true">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
              </div>
              <h2 className={styles.emptyTitle}>Select a student to begin review</h2>
              <p className={styles.emptyText}>
                HourBack pairs criteria-based assessment rubrics and classroom observations with
                sentence-level citations so you can approve grounded report comments in seconds.
              </p>

              <div className={styles.featurePills}>
                <span className={styles.featurePill}>100% Citation Grounded</span>
                <span className={styles.featurePill}>PII Anonymized</span>
                <span className={styles.featurePill}>Async Queue Pipeline</span>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

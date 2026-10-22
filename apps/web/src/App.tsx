import React, { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery } from '@apollo/client';
import { Header } from './components/Header';
import { ClassRoster } from './features/roster/ClassRoster';
import { CommentEditor } from './features/commentEditor/CommentEditor';
import { EvidencePane } from './features/evidence/EvidencePane';
import { JobProgressBanner } from './features/jobs/JobProgressBanner';
import { GradebookView } from './features/gradebook/GradebookView';
import { PortfoliosView } from './features/portfolios/PortfoliosView';
import { ReportCardsView } from './features/reportcards/ReportCardsView';
import { AnalyticsDashboardView } from './features/analytics/AnalyticsDashboardView';
import { AIAssistantDrawer } from './features/assistant/AIAssistantDrawer';
import { selectStudent, setAiAssistantOpen } from './store/uiSlice';
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
  const {
    selectedClassId,
    selectedPeriodId,
    selectedStudentId,
    activeTab,
    aiAssistantOpen,
  } = useSelector((s: RootState) => s.ui);

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
      <Header />

      <JobProgressBanner />

      {/* Render active view based on selected tab */}
      {selectedClassId && selectedPeriodId ? (
        <>
          {activeTab === 'gradebook' && (
            <GradebookView classId={selectedClassId} periodId={selectedPeriodId} />
          )}

          {activeTab === 'portfolios' && (
            <PortfoliosView classId={selectedClassId} periodId={selectedPeriodId} />
          )}

          {activeTab === 'reportcards' && (
            <ReportCardsView classId={selectedClassId} periodId={selectedPeriodId} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboardView classId={selectedClassId} periodId={selectedPeriodId} />
          )}

          {activeTab === 'comments' && (
            <main className={styles.mainLayout}>
              {/* Left Column: Virtualized Class Roster */}
              <section className={styles.rosterPane} aria-label="Student Roster">
                <ClassRoster classId={selectedClassId} periodId={selectedPeriodId} />
              </section>

              {/* Center / Right Column: SplitPane Editor or Welcome Empty State */}
              <section className={styles.detailArea} aria-label="Comment Editor & Evidence">
                {selectedStudentId ? (
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
          )}
        </>
      ) : (
        <div style={{ padding: 32, color: 'var(--color-text-muted)' }}>Loading classroom...</div>
      )}

      {/* HourBack AI Partner Slide-over Drawer */}
      {aiAssistantOpen && selectedClassId && (
        <AIAssistantDrawer
          classId={selectedClassId}
          onClose={() => dispatch(setAiAssistantOpen(false))}
        />
      )}
    </div>
  );
};

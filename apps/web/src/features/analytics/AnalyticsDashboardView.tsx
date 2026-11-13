import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_CLASS_GRADEBOOK, GET_TIME_SAVED_SUMMARY } from '../../graphql/operations';
import styles from './AnalyticsDashboardView.module.css';

interface AnalyticsDashboardViewProps {
  classId: string;
  periodId: string;
}

interface Criterion {
  name: string;
  maxLevel: number;
}

interface AssessmentResult {
  level: number;
  criterion: Criterion;
}

interface StudentItem {
  id: string;
  evidence: {
    assessmentResults: AssessmentResult[];
    observations: { id: string }[];
  };
  reportComment: { status: string } | null;
}

interface TimeSavedData {
  timeSavedSummary: {
    periodId: string;
    manualAvgSeconds: number | null;
    assistedAvgSeconds: number | null;
    timeSavedSeconds: number | null;
    timeSavedPercent: number | null;
    commentCount: number;
  };
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export const AnalyticsDashboardView: React.FC<AnalyticsDashboardViewProps> = ({ classId, periodId }) => {
  const gradebookQuery = useQuery<{ classRoster: StudentItem[] }>(GET_CLASS_GRADEBOOK, {
    variables: { classId, periodId },
    skip: !classId || !periodId,
  });
  const timeQuery = useQuery<TimeSavedData>(GET_TIME_SAVED_SUMMARY, {
    variables: { classId, periodId },
    skip: !classId || !periodId,
  });

  const students = gradebookQuery.data?.classRoster ?? [];
  const time = timeQuery.data?.timeSavedSummary;
  const hasTimeComparison = time?.manualAvgSeconds != null && time.assistedAvgSeconds != null;
  const savedPerComment = hasTimeComparison
    ? Math.max(0, time.manualAvgSeconds! - time.assistedAvgSeconds!)
    : null;
  const reductionPercent = hasTimeComparison && time.manualAvgSeconds! > 0
    ? Math.max(0, Math.round((savedPerComment! / time.manualAvgSeconds!) * 100))
    : null;

  const criteriaMap: Record<string, { sum: number; max: number; count: number }> = {};
  students.forEach((student) => {
    student.evidence.assessmentResults.forEach((result) => {
      const criterion = result.criterion;
      const stat = criteriaMap[criterion.name] ??= { sum: 0, max: criterion.maxLevel, count: 0 };
      stat.sum += result.level;
      stat.max = Math.max(stat.max, criterion.maxLevel);
      stat.count += 1;
    });
  });

  const criteriaAverages = Object.entries(criteriaMap).map(([name, stat]) => {
    const average = stat.sum / stat.count;
    return {
      name,
      average: average.toFixed(1),
      max: stat.max,
      percentage: stat.max > 0 ? Math.min(100, Math.round((average / stat.max) * 100)) : 0,
    };
  });

  const comments = students.map((student) => student.reportComment).filter(Boolean);
  const approvedComments = comments.filter((comment) => comment?.status.toLowerCase() === 'approved').length;
  const observedStudents = students.filter((student) => student.evidence.observations.length > 0).length;
  const assessedStudents = students.filter((student) => student.evidence.assessmentResults.length > 0).length;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <h2>Class Analytics</h2>
          <p className={styles.subtitle}>
            A period-level view of rubric evidence, comments, and recorded time comparisons.
          </p>
        </div>
        <div className={styles.contextBadge}>Selected class and reporting period</div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={`${styles.metricCard} ${styles.metricCardHighlight}`}>
          <div className={styles.metricHeader}><span className={styles.metricLabel}>Difference between time averages</span></div>
          <span className={styles.metricValue}>{timeQuery.loading ? '…' : formatDuration(savedPerComment)}</span>
          <span className={styles.metricSubtext}>
            {reductionPercent == null
              ? 'Add manual and assisted time logs to calculate'
              : `Manual ${formatDuration(time?.manualAvgSeconds)} → assisted ${formatDuration(time?.assistedAvgSeconds)} · ${reductionPercent}% difference`}
          </span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}><span className={styles.metricLabel}>Recorded time entries</span></div>
          <span className={styles.metricValue}>{timeQuery.loading ? '…' : timeQuery.error ? '—' : time?.commentCount ?? 0}</span>
          <span className={styles.metricSubtextNeutral}>{timeQuery.error ? 'Could not load time logs' : 'Manual and assisted entries for this class'}</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}><span className={styles.metricLabel}>Comments approved</span></div>
          <span className={styles.metricValue}>{gradebookQuery.loading ? '…' : gradebookQuery.error ? '—' : approvedComments}</span>
          <span className={styles.metricSubtextNeutral}>From {comments.length} students with a comment</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}><span className={styles.metricLabel}>Students with rubric evidence</span></div>
          <span className={styles.metricValue}>{gradebookQuery.loading ? '…' : gradebookQuery.error ? '—' : assessedStudents}</span>
          <span className={styles.metricSubtextNeutral}>Observation notes on {observedStudents} students</span>
        </div>
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Rubric strand averages</h3>
          {gradebookQuery.loading ? <p className={styles.emptyState}>Loading rubric results…</p> : null}
          {gradebookQuery.error ? <p className={styles.errorState}>Could not load rubric results. Try changing the class or period.</p> : null}
          {!gradebookQuery.loading && !gradebookQuery.error && criteriaAverages.length === 0 ? (
            <p className={styles.emptyState}>No rubric results recorded for this class and period yet.</p>
          ) : null}
          {!gradebookQuery.loading && !gradebookQuery.error && criteriaAverages.length > 0 ? (
            <div className={styles.barChart}>
              {criteriaAverages.map((criterion) => (
                <div key={criterion.name} className={styles.barRow}>
                  <span className={styles.barLabel} title={criterion.name}>{criterion.name}</span>
                  <div className={styles.barTrack} role="img" aria-label={`${criterion.name}: ${criterion.average} of ${criterion.max}`}>
                    <div className={styles.barFill} style={{ width: `${criterion.percentage}%` }} />
                  </div>
                  <span className={styles.barValue}>{criterion.average}/{criterion.max}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Class workflow snapshot</h3>
          {gradebookQuery.loading ? <p className={styles.emptyState}>Loading class activity…</p> : null}
          {gradebookQuery.error ? <p className={styles.errorState}>Could not load class activity. Try again in a moment.</p> : null}
          {!gradebookQuery.loading && !gradebookQuery.error ? (
            <div className={styles.workflowList}>
              <div className={styles.workflowRow}><span>Students in class</span><strong>{students.length}</strong></div>
              <div className={styles.workflowRow}><span>Students with assessment results</span><strong>{assessedStudents}</strong></div>
              <div className={styles.workflowRow}><span>Students with observation notes</span><strong>{observedStudents}</strong></div>
              <div className={styles.workflowRow}><span>Approved report comments</span><strong>{approvedComments}</strong></div>
            </div>
          ) : null}
          <p className={styles.disclosure}>
            Time comparisons appear only when both manual and assisted durations have been recorded. No projected class-wide hours are shown.
          </p>
        </div>
      </div>
    </div>
  );
};

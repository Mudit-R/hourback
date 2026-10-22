import React from 'react';
import { useQuery } from '@apollo/client';
import { useDispatch, useSelector } from 'react-redux';
import { GET_GENERATION_JOB } from '../../graphql/operations';
import { setActiveJob } from '../../store/uiSlice';
import type { RootState } from '../../store';
import styles from './JobProgressBanner.module.css';

interface GenerationJobData {
  generationJob: {
    id: string;
    total: number;
    done: number;
    failed: number;
    status: 'pending' | 'running' | 'completed' | 'partial' | 'failed';
  } | null;
}

export const JobProgressBanner: React.FC = () => {
  const dispatch = useDispatch();
  const activeJobId = useSelector((s: RootState) => s.ui.activeJobId);

  const { data } = useQuery<GenerationJobData>(GET_GENERATION_JOB, {
    variables: { jobId: activeJobId },
    skip: !activeJobId,
    pollInterval: 2500,
  });

  if (!activeJobId || !data?.generationJob) {
    return null;
  }

  const job = data.generationJob;
  const isFinished = job.status === 'completed' || job.status === 'partial' || job.status === 'failed' || (job.total > 0 && (job.done + job.failed) >= job.total);
  const pct = job.total > 0 ? Math.min(100, Math.round(((job.done + job.failed) / job.total) * 100)) : 0;

  React.useEffect(() => {
    if (isFinished) {
      const timer = setTimeout(() => {
        dispatch(setActiveJob(null));
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [isFinished, dispatch]);

  return (
    <div
      className={styles.banner}
      role="status"
      aria-live="polite"
      id="job-progress-banner"
    >
      <div className={styles.bannerContent}>
        {!isFinished && <div className={styles.spinner} aria-hidden="true" />}
        <span className={styles.text}>
          {isFinished ? (
            <>
              Generation <span className={styles.bold}>{job.status}</span>: {job.done} generated
              {job.failed > 0 && `, ${job.failed} flagged for review`} of {job.total} students.
            </>
          ) : (
            <>
              Generating draft comments asynchronously: <span className={styles.bold}>{job.done}</span> of{' '}
              <span className={styles.bold}>{job.total}</span> completed ({pct}%).
            </>
          )}
        </span>
      </div>

      <div className={styles.barWrapper} aria-hidden="true">
        <div className={styles.barFill} style={{ width: `${pct}%` }} />
      </div>

      <button
        type="button"
        className={styles.dismissBtn}
        onClick={() => dispatch(setActiveJob(null))}
        aria-label="Dismiss progress notification"
        title="Dismiss"
      >
        &times;
      </button>
    </div>
  );
};

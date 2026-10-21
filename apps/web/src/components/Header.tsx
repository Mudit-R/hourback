import React from 'react';
import { useQuery } from '@apollo/client';
import { useDispatch, useSelector } from 'react-redux';
import { GET_TEACHER_CLASSES } from '../graphql/operations';
import { selectClass } from '../store/uiSlice';
import type { RootState } from '../store';
import styles from './Header.module.css';

interface ReportPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface ClassItem {
  id: string;
  name: string;
  grade: string;
  subject: string;
  academicYear: string;
  reportPeriods: ReportPeriod[];
}

interface TeacherClassesData {
  me: { id: string; name: string; email: string; school: string } | null;
  classes: ClassItem[];
}

interface HeaderProps {
  onToggleAnalytics: () => void;
  analyticsOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleAnalytics, analyticsOpen }) => {
  const dispatch = useDispatch();
  const { selectedClassId, selectedPeriodId } = useSelector((s: RootState) => s.ui);

  const { data } = useQuery<TeacherClassesData>(GET_TEACHER_CLASSES, {
    onCompleted: (d) => {
      if (!selectedClassId && d.classes.length > 0) {
        const firstClass = d.classes[0]!;
        const firstPeriod = firstClass.reportPeriods[0];
        if (firstPeriod) {
          dispatch(selectClass({ classId: firstClass.id, periodId: firstPeriod.id }));
        }
      }
    },
  });

  const classes = data?.classes ?? [];
  const currentClass = classes.find((c) => c.id === selectedClassId) ?? classes[0];
  const periods = currentClass?.reportPeriods ?? [];

  const handleClassChange = (newClassId: string) => {
    const targetClass = classes.find((c) => c.id === newClassId);
    const targetPeriod = targetClass?.reportPeriods[0];
    if (targetPeriod) {
      dispatch(selectClass({ classId: newClassId, periodId: targetPeriod.id }));
    }
  };

  const handlePeriodChange = (newPeriodId: string) => {
    if (selectedClassId) {
      dispatch(selectClass({ classId: selectedClassId, periodId: newPeriodId }));
    }
  };

  const teacherName = data?.me?.name ?? 'Ms. Anita Rao';

  return (
    <header className={styles.header}>
      <div className={styles.leftArea}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoMark} aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <span className={styles.brandName}>HourBack</span>
        </div>

        {classes.length > 0 && (
          <>
            <div className={styles.headerSep} aria-hidden="true" />
            <div className={styles.classSelectorWrapper}>
              {/* Class selector */}
              <div className={styles.selectWrap}>
                <span className={styles.selectIcon}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <select
                  className={styles.select}
                  value={selectedClassId ?? currentClass?.id ?? ''}
                  onChange={(e) => handleClassChange(e.target.value)}
                  aria-label="Select class"
                  id="select-class-dropdown"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {periods.length > 0 && (
                <div className={styles.selectWrap}>
                  <span className={styles.selectIcon}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                  <select
                    className={styles.select}
                    value={selectedPeriodId ?? periods[0]?.id ?? ''}
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    aria-label="Select report period"
                    id="select-period-dropdown"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className={styles.rightArea}>
        <button
          type="button"
          className={`${styles.analyticsToggleBtn} ${analyticsOpen ? styles.analyticsToggleBtnActive : ''}`}
          onClick={onToggleAnalytics}
          aria-pressed={analyticsOpen}
          id="btn-toggle-analytics"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Time Saved
        </button>

        <div className={styles.teacherBadge}>
          <div className={styles.teacherAvatar} aria-hidden="true">
            {teacherName.charAt(0)}
          </div>
          {teacherName}
        </div>
      </div>
    </header>
  );
};

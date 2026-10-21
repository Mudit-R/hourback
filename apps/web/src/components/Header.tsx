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
  me: {
    id: string;
    name: string;
    email: string;
    school: string;
  } | null;
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
      // Auto-select first class and first period if none selected
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
        <div className={styles.logo}>
          <div className={styles.logoIcon} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <span className={styles.brandName}>HourBack</span>
          <span className={styles.brandBadge}>AI Copilot</span>
        </div>

        {classes.length > 0 && (
          <div className={styles.classSelectorWrapper}>
            <select
              className={styles.select}
              value={selectedClassId ?? currentClass?.id ?? ''}
              onChange={(e) => handleClassChange(e.target.value)}
              aria-label="Select class"
              id="select-class-dropdown"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {periods.length > 0 && (
              <select
                className={styles.select}
                value={selectedPeriodId ?? periods[0]?.id ?? ''}
                onChange={(e) => handlePeriodChange(e.target.value)}
                aria-label="Select report period"
                id="select-period-dropdown"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>Time Saved</span>
        </button>

        <div className={styles.teacherBadge}>
          <div className={styles.teacherAvatar} aria-hidden="true">
            {teacherName.charAt(0)}
          </div>
          <span style={{ fontWeight: 600 }}>{teacherName}</span>
        </div>
      </div>
    </header>
  );
};

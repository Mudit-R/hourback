import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { useDispatch, useSelector } from 'react-redux';
import { GET_TEACHER_CLASSES } from '../graphql/operations';
import { selectClass, setActiveTab, setAiAssistantOpen, type AppTab } from '../store/uiSlice';
import type { RootState } from '../store';
import { useAuth } from '../context/AuthContext';
import { CreateClassModal } from '../features/classes/CreateClassModal';
import { ActivityDrawer } from '../features/activity/ActivityDrawer';
import { AuthModal } from '../features/auth/AuthModal';
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

export const Header: React.FC = () => {
  const dispatch = useDispatch();
  const { selectedClassId, selectedPeriodId, activeTab } = useSelector((s: RootState) => s.ui);
  const { teacher, teachers, switchTeacher, logout, setIsAuthModalOpen, setAuthModalMode } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const teacherDisplayName = teacher?.name ?? data?.me?.name ?? 'Ms. Anita Rao';
  const schoolDisplayName = teacher?.school ?? data?.me?.school ?? 'Delhi International School';

  const navItems: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'comments',
      label: 'Report Comments',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      id: 'gradebook',
      label: 'Gradebook & Rubrics',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      ),
    },
    {
      id: 'portfolios',
      label: 'Portfolios & Notes',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: 'reportcards',
      label: 'Family Report Cards',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      ),
    },
    {
      id: 'analytics',
      label: '10-Hr BHAG Impact',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
    },
  ];

  return (
    <>
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

          <div className={styles.headerSep} aria-hidden="true" />

          {/* Class & Period Selectors + Register Class Button */}
          <div className={styles.classSelectorWrapper}>
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

            <button
              type="button"
              className={styles.registerClassBtn}
              onClick={() => setCreateClassOpen(true)}
              title="Register a new class with criteria rubrics"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Class</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className={styles.navTabs} aria-label="Main Navigation">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.navTab} ${activeTab === item.id ? styles.navTabActive : ''}`}
                onClick={() => dispatch(setActiveTab(item.id))}
                id={`nav-tab-${item.id}`}
              >
                <span className={styles.navTabIcon} aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className={styles.rightArea}>
          {/* Real-time System Updates / Audit trigger */}
          <button
            type="button"
            className={styles.activityBtn}
            onClick={() => setActivityOpen(true)}
            title="View system updates and audit log"
          >
            <span className={styles.activityDot} />
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span>Updates</span>
          </button>

          {/* AI Partner Drawer trigger */}
          <button
            type="button"
            className={styles.aiPartnerBtn}
            onClick={() => dispatch(setAiAssistantOpen(true))}
            id="btn-open-ai-partner"
            title="Open AI Teaching Partner assistant"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span>HourBack AI Partner</span>
          </button>

          {/* Educator Account Dropdown */}
          <div className={styles.profileWrapper} ref={dropdownRef}>
            <div
              className={styles.teacherBadge}
              onClick={() => setProfileOpen(!profileOpen)}
              role="button"
              tabIndex={0}
              aria-label="Educator account menu"
            >
              <div className={styles.teacherAvatar} aria-hidden="true">
                {teacherDisplayName.charAt(0)}
              </div>
              <span>{teacherDisplayName}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {profileOpen && (
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownName}>{teacherDisplayName}</div>
                  <div className={styles.dropdownSchool}>{schoolDisplayName}</div>
                </div>

                <div className={styles.dropdownSection}>
                  <div className={styles.dropdownSectionTitle}>Quick Switch Educator</div>
                  {teachers.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => {
                        switchTeacher(t.id);
                        setProfileOpen(false);
                      }}
                    >
                      <span>{t.name}</span>
                      {t.id === teacher?.id && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>

                <div className={styles.dropdownDivider} />

                <div className={styles.dropdownSection}>
                  <button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => {
                      setCreateClassOpen(true);
                      setProfileOpen(false);
                    }}
                  >
                    <span>Register New Classroom</span>
                  </button>

                  <button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => {
                      setAuthModalMode('signup');
                      setIsAuthModalOpen(true);
                      setProfileOpen(false);
                    }}
                  >
                    <span>Create New Account</span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.dropdownItem} ${styles.dropdownLogout}`}
                    onClick={() => {
                      logout();
                      setProfileOpen(false);
                    }}
                  >
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Modals & Drawers */}
      <CreateClassModal
        isOpen={createClassOpen}
        onClose={() => setCreateClassOpen(false)}
        onClassCreated={(newClassId) => {
          handleClassChange(newClassId);
        }}
      />

      <ActivityDrawer
        isOpen={activityOpen}
        onClose={() => setActivityOpen(false)}
        classId={selectedClassId ?? undefined}
      />

      <AuthModal />
    </>
  );
};

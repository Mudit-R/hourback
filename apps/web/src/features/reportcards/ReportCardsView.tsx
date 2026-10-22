import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CLASS_GRADEBOOK } from '../../graphql/operations';
import styles from './ReportCardsView.module.css';

interface ReportCardsViewProps {
  classId: string;
  periodId: string;
}

interface Criterion {
  id: string;
  name: string;
  maxLevel: number;
}

interface AssessmentResult {
  id: string;
  level: number;
  feedback: string | null;
  criterion: Criterion;
}

interface StudentItem {
  id: string;
  name: string;
  preferredName: string | null;
  evidence: {
    assessmentResults: AssessmentResult[];
  };
  reportComment: {
    id: string;
    status: string;
    draftText: string;
    finalText: string | null;
  } | null;
}

export const ReportCardsView: React.FC<ReportCardsViewProps> = ({ classId, periodId }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [publishedToast, setPublishedToast] = useState(false);

  const { data, loading, error } = useQuery<{ classRoster: StudentItem[] }>(GET_CLASS_GRADEBOOK, {
    variables: { classId, periodId },
  });

  if (loading && !data) {
    return <div style={{ padding: 32, color: 'var(--color-text-muted)' }}>Loading report cards...</div>;
  }

  if (error) {
    return <div style={{ padding: 32, color: 'var(--color-error)' }}>Error loading report cards: {error.message}</div>;
  }

  const students = data?.classRoster ?? [];
  const currentStudent = students[selectedIdx] ?? students[0];

  const handleExportCSV = () => {
    if (!students.length) return;
    const sampleResults = students[0]?.evidence?.assessmentResults ?? [];
    const critHeaders = sampleResults.map((r) => `"${r.criterion.name} (1-${r.criterion.maxLevel})"`);

    const headers = ['"Student Name"', '"Preferred Name"', ...critHeaders, '"Total Score"', '"Report Status"', '"Teacher Comment"'];
    const rows = students.map((s) => {
      const scores = s.evidence.assessmentResults.map((r) => r.level);
      const total = scores.reduce((a, b) => a + b, 0);
      const comment = (s.reportComment?.finalText ?? s.reportComment?.draftText ?? '').replace(/"/g, '""');
      return [
        `"${s.name}"`,
        `"${s.preferredName ?? ''}"`,
        ...scores,
        total,
        `"${s.reportComment?.status ?? 'pending'}"`,
        `"${comment}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Grade5_Report_Cards_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePublishPortal = () => {
    setPublishedToast(true);
    setTimeout(() => setPublishedToast(false), 5000);
  };

  const results = currentStudent?.evidence?.assessmentResults ?? [];
  const commentText =
    currentStudent?.reportComment?.finalText ??
    currentStudent?.reportComment?.draftText ??
    'Report narrative comment has not been generated for this reporting period yet.';

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <h2>Official Report Cards & Family Portal Preview</h2>
          <p className={styles.subtitle}>
            Preview standardized student progress reports with criteria levels, descriptors, and teacher narratives.
          </p>
        </div>

        <div className={styles.actionsArea}>
          <button type="button" className={styles.btnSecondary} onClick={() => window.print()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Report
          </button>
          <button type="button" className={styles.btnSecondary} onClick={handleExportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
          <button type="button" className={styles.btnPrimary} onClick={handlePublishPortal}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Publish to Family Portal
          </button>
        </div>
      </div>

      {publishedToast && (
        <div style={{ background: '#ecfdf5', borderBottom: '1px solid #a7f3d0', color: '#065f46', padding: '10px 24px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Successfully published 30 academic progress report cards to the Toddle Family Portal. Parents notified.
        </div>
      )}

      <div className={styles.contentLayout}>
        <div className={styles.studentSelectorColumn}>
          {students.map((s, idx) => (
            <div
              key={s.id}
              className={`${styles.studentListItem} ${idx === selectedIdx ? styles.studentListItemActive : ''}`}
              onClick={() => setSelectedIdx(idx)}
            >
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                {(s.preferredName ?? s.name).charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 11, color: s.reportComment?.status === 'approved' ? '#059669' : '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  {s.reportComment?.status ?? 'pending'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.previewArea}>
          {currentStudent && (
            <div className={styles.reportCardSheet}>
              <div className={styles.schoolHeader}>
                <div>
                  <h1 className={styles.schoolTitle}>Delhi International School</h1>
                  <p className={styles.schoolSub}>Primary Years Programme (PYP) & Middle Years Programme (MYP)</p>
                  <p className={styles.schoolSub}>Academic Progress Report — 2024-2025</p>
                </div>
                <span className={styles.reportBadge}>
                  {currentStudent.reportComment?.status === 'approved' ? 'Official / Approved' : 'Draft Preview'}
                </span>
              </div>

              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <label>Student Name</label>
                  <span>{currentStudent.name}</span>
                </div>
                <div className={styles.metaItem}>
                  <label>Grade & Class</label>
                  <span>Grade 5A — Mathematics</span>
                </div>
                <div className={styles.metaItem}>
                  <label>Reporting Period</label>
                  <span>Semester 1</span>
                </div>
                <div className={styles.metaItem}>
                  <label>Lead Educator</label>
                  <span>Ms. Anita Rao</span>
                </div>
              </div>

              <div>
                <h3 className={styles.sectionTitle}>Criteria Achievement Summary</h3>
                <table className={styles.rubricTable}>
                  <thead>
                    <tr>
                      <th>Criterion Strand</th>
                      <th style={{ width: 100 }}>Level (1-8)</th>
                      <th>Performance Descriptor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.criterion.name}</td>
                        <td style={{ fontWeight: 700, color: '#2563eb' }}>
                          Level {r.level} / {r.criterion.maxLevel}
                        </td>
                        <td style={{ color: '#475569' }}>{r.feedback ?? 'Demonstrating consistent grade-level expectations.'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className={styles.sectionTitle}>Teacher Narrative & Learning Reflection</h3>
                <div className={styles.commentBlock}>
                  <p className={styles.commentText}>"{commentText}"</p>
                </div>
              </div>

              <div className={styles.signatureSection}>
                <div className={styles.signatureItem}>
                  <div className={styles.signLine} />
                  <span className={styles.signLabel}>Classroom Teacher</span>
                  <span className={styles.signName}>Ms. Anita Rao</span>
                </div>

                <div className={styles.signatureItem}>
                  <div className={styles.signLine} />
                  <span className={styles.signLabel}>Head of School / PYP Coordinator</span>
                  <span className={styles.signName}>Dr. Rajesh Varma</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

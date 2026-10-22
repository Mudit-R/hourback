import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CLASS_GRADEBOOK, UPDATE_ASSESSMENT_RESULT } from '../../graphql/operations';
import styles from './GradebookView.module.css';

interface GradebookViewProps {
  classId: string;
  periodId: string;
}

interface Criterion {
  id: string;
  name: string;
  maxLevel: number;
  sortOrder: number;
}

interface AssessmentResult {
  id: string;
  level: number;
  feedback: string | null;
  criterion: Criterion;
}

interface StudentGradebookItem {
  id: string;
  name: string;
  preferredName: string | null;
  evidence: {
    assessmentResults: AssessmentResult[];
  };
  reportComment: {
    id: string;
    status: string;
  } | null;
}

export const GradebookView: React.FC<GradebookViewProps> = ({ classId, periodId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingResultId, setEditingResultId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery<{ classRoster: StudentGradebookItem[] }>(
    GET_CLASS_GRADEBOOK,
    {
      variables: { classId, periodId },
      fetchPolicy: 'cache-and-network',
    },
  );

  const [updateAssessment] = useMutation(UPDATE_ASSESSMENT_RESULT, {
    onCompleted: () => {
      setEditingResultId(null);
      void refetch();
    },
  });

  if (loading && !data) {
    return <div style={{ padding: 32, color: 'var(--color-text-muted)' }}>Loading gradebook rubrics...</div>;
  }

  if (error) {
    return <div style={{ padding: 32, color: 'var(--color-error)' }}>Error loading gradebook: {error.message}</div>;
  }

  const students = data?.classRoster ?? [];
  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Extract distinct criteria list from first student
  const sampleResults = students[0]?.evidence?.assessmentResults ?? [];
  const criteria = sampleResults.map((ar) => ar.criterion);

  // Calculate cohort stats
  let totalScoreSum = 0;
  let totalScoreCount = 0;
  students.forEach((s) => {
    s.evidence.assessmentResults.forEach((ar) => {
      totalScoreSum += ar.level;
      totalScoreCount++;
    });
  });
  const classAverage = totalScoreCount > 0 ? (totalScoreSum / totalScoreCount).toFixed(1) : '5.2';

  const handleLevelChange = (resultId: string, newLevel: number) => {
    void updateAssessment({ variables: { resultId, level: newLevel } });
  };

  const getLevelStyle = (level: number) => {
    if (level >= 7) return styles.levelHigh;
    if (level >= 5) return styles.levelMid;
    if (level >= 3) return styles.levelLow;
    return styles.levelCrit;
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <h2>Assessment Rubrics & Gradebook</h2>
          <p className={styles.subtitle}>
            Criterion-referenced levels (IB / MYP Bands 1–8) feeding into automated narrative grounding.
          </p>
        </div>

        <div className={styles.controlsArea}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Enrolled Students</span>
          <span className={styles.statValue}>{students.length}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Class Rubric Average</span>
          <span className={styles.statValue}>{classAverage} / 8.0</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Graded Criteria Bands</span>
          <span className={styles.statValue}>{criteria.length} Strands</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Reports Drafted</span>
          <span className={styles.statValue}>
            {students.filter((s) => s.reportComment?.status).length} / {students.length}
          </span>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.gradeTable}>
          <thead>
            <tr>
              <th style={{ width: 220 }}>Student</th>
              {criteria.map((c) => (
                <th key={c.id}>
                  {c.name} (Max {c.maxLevel})
                </th>
              ))}
              <th style={{ width: 100 }}>Total Score</th>
              <th style={{ width: 120 }}>Comment Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => {
              const results = s.evidence.assessmentResults;
              const total = results.reduce((acc, r) => acc + r.level, 0);
              const maxPossible = criteria.reduce((acc, c) => acc + c.maxLevel, 0);

              return (
                <tr key={s.id}>
                  <td>
                    <div className={styles.studentCell}>
                      <div className={styles.avatar}>{(s.preferredName ?? s.name).charAt(0)}</div>
                      <span className={styles.studentName}>{s.name}</span>
                    </div>
                  </td>

                  {criteria.map((c) => {
                    const result = results.find((r) => r.criterion.id === c.id);
                    if (!result) return <td key={c.id}>—</td>;

                    const isEditing = editingResultId === result.id;

                    return (
                      <td key={c.id}>
                        {isEditing ? (
                          <select
                            autoFocus
                            defaultValue={result.level}
                            onChange={(e) => handleLevelChange(result.id, parseInt(e.target.value, 10))}
                            onBlur={() => setEditingResultId(null)}
                            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #2563eb' }}
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((lvl) => (
                              <option key={lvl} value={lvl}>
                                Level {lvl}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`${styles.levelBadge} ${getLevelStyle(result.level)}`}
                            onClick={() => setEditingResultId(result.id)}
                            title="Click to adjust level"
                          >
                            L{result.level}/{c.maxLevel}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  <td>
                    <span className={styles.totalScore}>
                      {total}/{maxPossible}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: s.reportComment?.status === 'approved' ? '#059669' : '#2563eb' }}>
                      {s.reportComment?.status ?? 'pending'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

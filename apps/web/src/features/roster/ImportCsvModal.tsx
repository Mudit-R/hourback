import React, { useState, useRef } from 'react';
import { useMutation } from '@apollo/client';
import { MUTATION_BULK_IMPORT } from '../../graphql/authOperations';
import { GET_CLASS_ROSTER } from '../../graphql/operations';
import styles from './ImportCsvModal.module.css';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  periodId: string;
}

interface ParsedStudent {
  name: string;
  preferredName?: string;
  rubricLevel?: number;
  observation?: string;
}

const SAMPLE_CSV = `name,preferred_name,rubric_level,observation
Devanshi Roy,Devanshi,6,Consistently demonstrates advanced problem solving during mathematical inquiry.
Kunal Saxena,Kunal,5,Actively collaborates in peer groups and offers constructive feedback.
Tarun Venkatesh,Tarun,4,Meeting grade level standards independently; expanding narrative vocabulary.
Simran Chawla,Simran,7,Exemplary conceptual grasp in unit project; initiated peer extension tasks.`;

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  classId,
  periodId,
}) => {
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedStudent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bulkImportMutation] = useMutation(MUTATION_BULK_IMPORT, {
    refetchQueries: [{ query: GET_CLASS_ROSTER, variables: { classId, periodId } }],
  });

  if (!isOpen) return null;

  const parseCsv = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const rows: ParsedStudent[] = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;
      const parts = line.split(',').map((p) => p.trim());
      if (parts[0]) {
        rows.push({
          name: parts[0],
          preferredName: parts[1] || undefined,
          rubricLevel: parts[2] ? parseInt(parts[2], 10) : 4,
          observation: parts.slice(3).join(',') || undefined,
        });
      }
    }
    return rows;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCsvText(val);
    setParsedRows(parseCsv(val));
  };

  const handleLoadSample = () => {
    setCsvText(SAMPLE_CSV);
    setParsedRows(parseCsv(SAMPLE_CSV));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
        setParsedRows(parseCsv(content));
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (parsedRows.length === 0) return;
    setSubmitting(true);

    try {
      await bulkImportMutation({
        variables: {
          classId,
          students: parsedRows.map((r) => ({
            name: r.name,
            preferredName: r.preferredName || null,
            rubricLevel: r.rubricLevel || 4,
            observation: r.observation || null,
          })),
        },
      });
      setCsvText('');
      setParsedRows([]);
      onClose();
    } catch (err) {
      console.error('Failed to import CSV:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Import Roster & Assessment Data</h2>
            <p className={styles.subtitle}>
              Upload spreadsheet data from Excel, Google Sheets, or school SIS (.csv)
            </p>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          <div
            className={styles.dropZone}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".csv"
              onChange={handleFileUpload}
            />
            <div className={styles.dropTitle}>Click to upload CSV spreadsheet</div>
            <div className={styles.dropSub}>Supported columns: name, preferred_name, rubric_level, observation</div>
          </div>

          <div className={styles.actionsRow}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Or paste CSV rows directly below:</span>
            <button type="button" className={styles.sampleBtn} onClick={handleLoadSample}>
              Load sample dataset
            </button>
          </div>

          <textarea
            className={styles.textarea}
            value={csvText}
            onChange={handleTextChange}
            placeholder="name,preferred_name,rubric_level,observation&#10;Aarav Sharma,Aarav,6,Consistently applies mathematical reasoning."
          />

          {parsedRows.length > 0 && (
            <div className={styles.previewSection}>
              <div className={styles.previewLabel}>Parsed Preview ({parsedRows.length} Students)</div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Preferred</th>
                      <th>Level</th>
                      <th>Observation Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td>{r.preferredName ?? '—'}</td>
                        <td>Level {r.rubricLevel ?? 4}/8</td>
                        <td style={{ color: '#64748b' }}>{r.observation ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={submitting || parsedRows.length === 0}
          >
            {submitting ? 'Importing...' : `Import ${parsedRows.length} Students to Class`}
          </button>
        </div>
      </div>
    </div>
  );
};

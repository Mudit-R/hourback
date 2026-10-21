import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_REPORT_COMMENT,
  UPDATE_COMMENT,
  APPROVE_COMMENT,
  REGENERATE_COMMENT,
  GET_CLASS_ROSTER,
  GET_TIME_SAVED_SUMMARY,
} from '../../graphql/operations';
import { StatusChip } from '../../components/StatusChip';
import styles from './CommentEditor.module.css';

interface Citation {
  sentenceIdx: number;
  sourceType: string;
  sourceId: string;
}

interface ReportComment {
  id: string;
  draftText: string;
  finalText: string | null;
  status: 'draft' | 'edited' | 'approved' | 'flagged';
  model: string | null;
  groundednessScore: number | null;
  editDistance: number | null;
  generationMs: number | null;
  tone: 'warm' | 'formal' | 'encouraging' | null;
  length: 'short' | 'medium' | 'long' | null;
  citations: Citation[];
}

interface CommentData {
  reportComment: ReportComment | null;
}

interface CommentEditorProps {
  studentId: string;
  periodId: string;
  classId: string;
  studentName?: string;
  onHoverEvidence: (evidenceIds: string[]) => void;
  onNextStudent?: () => void;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

export const CommentEditor: React.FC<CommentEditorProps> = ({
  studentId,
  periodId,
  classId,
  studentName,
  onHoverEvidence,
  onNextStudent,
}) => {
  const [text, setText] = useState('');
  const [selectedTone, setSelectedTone] = useState<'warm' | 'formal' | 'encouraging'>('warm');
  const [selectedLength, setSelectedLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [hoveredSentenceIdx, setHoveredSentenceIdx] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data, loading, error, refetch } = useQuery<CommentData>(GET_REPORT_COMMENT, {
    variables: { studentId, periodId },
    skip: !studentId || !periodId,
    fetchPolicy: 'cache-and-network',
  });

  const comment = data?.reportComment;

  // Initialize timer on student change
  useEffect(() => {
    setElapsedSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [studentId]);

  // Sync comment text
  useEffect(() => {
    if (comment) {
      setText(comment.finalText ?? comment.draftText);
      if (comment.tone) setSelectedTone(comment.tone);
      if (comment.length) setSelectedLength(comment.length);
    } else {
      setText('');
    }
  }, [comment]);

  const [updateComment, { loading: saving }] = useMutation(UPDATE_COMMENT, {
    refetchQueries: [
      { query: GET_CLASS_ROSTER, variables: { classId, periodId } },
      { query: GET_TIME_SAVED_SUMMARY, variables: { classId, periodId } },
    ],
  });

  const [approveComment, { loading: approving }] = useMutation(APPROVE_COMMENT, {
    refetchQueries: [
      { query: GET_CLASS_ROSTER, variables: { classId, periodId } },
      { query: GET_TIME_SAVED_SUMMARY, variables: { classId, periodId } },
    ],
    onCompleted: () => {
      if (onNextStudent) onNextStudent();
    },
  });

  const [regenerateComment, { loading: regenerating }] = useMutation(REGENERATE_COMMENT, {
    onCompleted: () => {
      void refetch();
    },
  });

  // Calculate live edit distance
  const currentEditDistance = useMemo(() => {
    if (!comment?.draftText) return 0;
    return levenshtein(comment.draftText, text);
  }, [comment?.draftText, text]);

  // Split draft text into sentences for citation exploration
  const sentencesWithCitations = useMemo(() => {
    if (!comment?.draftText) return [];
    // Match sentence boundaries roughly
    const sentences = comment.draftText.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [comment.draftText];
    const citations = comment.citations ?? [];

    return sentences.map((s, idx) => {
      const sentenceCitations = citations.filter((c) => c.sentenceIdx === idx);
      return {
        text: s.trim(),
        idx,
        citations: sentenceCitations,
        evidenceIds: sentenceCitations.map((c) => c.sourceId),
      };
    });
  }, [comment?.draftText, comment?.citations]);

  const handleSave = () => {
    if (!comment?.id) return;
    void updateComment({
      variables: {
        commentId: comment.id,
        text,
      },
    });
  };

  const handleApprove = () => {
    if (!comment?.id) return;
    void approveComment({
      variables: {
        commentId: comment.id,
        timeTakenSeconds: Math.max(elapsedSeconds, 5),
      },
    });
  };

  const handleRegenerate = () => {
    if (!comment?.id) return;
    void regenerateComment({
      variables: {
        commentId: comment.id,
        tone: selectedTone,
        length: selectedLength,
      },
    });
  };

  if (loading) {
    return <div className={styles.emptyState}>Loading report comment...</div>;
  }

  if (error) {
    return <div className={styles.emptyState}>Error: {error.message}</div>;
  }

  if (!comment) {
    return (
      <div className={styles.emptyState} id="comment-editor-empty">
        <div className={styles.emptyIcon} aria-hidden="true">✍️</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          No Comment Draft Yet
        </h3>
        <p style={{ maxWidth: 360, fontSize: 13, lineHeight: 1.5 }}>
          A comment draft has not been generated for {studentName ?? 'this student'} in this reporting period.
          Click <strong>Generate All</strong> in the roster header to generate drafts asynchronously.
        </p>
      </div>
    );
  }

  const groundedPct =
    comment.groundednessScore != null ? Math.round(comment.groundednessScore * 100) : null;

  const timerMin = Math.floor(elapsedSeconds / 60);
  const timerSec = elapsedSeconds % 60;
  const timerDisplay = `${timerMin}:${timerSec < 10 ? '0' : ''}${timerSec}`;

  return (
    <div className={styles.container} id="comment-editor">
      {/* Editor Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <span className={styles.studentName}>{studentName ?? 'Report Comment'}</span>
            <StatusChip status={comment.status} />
          </div>

          <div className={styles.metaRow}>
            {groundedPct != null && (
              <span
                className={`${styles.metaPill} ${
                  groundedPct >= 80 ? styles.groundedGreen : styles.groundedAmber
                }`}
                title="Percentage of evidence items cited in this comment"
              >
                ✓ {groundedPct}% Grounded
              </span>
            )}
            {comment.generationMs && (
              <span className={styles.metaPill}>⚡ {(comment.generationMs / 1000).toFixed(1)}s</span>
            )}
            {comment.model && <span className={styles.metaPill}>🤖 {comment.model}</span>}
          </div>
        </div>

        <div className={styles.headerControls}>
          <select
            className={styles.select}
            value={selectedTone}
            onChange={(e) => setSelectedTone(e.target.value as 'warm' | 'formal' | 'encouraging')}
            aria-label="Comment tone"
            id="select-comment-tone"
          >
            <option value="warm">Warm Tone</option>
            <option value="formal">Formal Tone</option>
            <option value="encouraging">Encouraging Tone</option>
          </select>

          <select
            className={styles.select}
            value={selectedLength}
            onChange={(e) => setSelectedLength(e.target.value as 'short' | 'medium' | 'long')}
            aria-label="Comment length"
            id="select-comment-length"
          >
            <option value="short">Short (1–3)</option>
            <option value="medium">Medium (2–5)</option>
            <option value="long">Long (4–8)</option>
          </select>
        </div>
      </div>

      <div className={styles.body}>
        {/* Sentence-by-sentence breakdown with clickable citations */}
        <div>
          <div className={styles.sectionTitle}>
            Sentence Citations ({sentencesWithCitations.length} sentences)
          </div>
          <div className={styles.sentenceBreakdown}>
            {sentencesWithCitations.map((s) => {
              const isActive = hoveredSentenceIdx === s.idx;
              return (
                <div
                  key={s.idx}
                  className={`${styles.sentenceCard} ${isActive ? styles.sentenceCardActive : ''}`}
                  onMouseEnter={() => {
                    setHoveredSentenceIdx(s.idx);
                    onHoverEvidence(s.evidenceIds);
                  }}
                  onMouseLeave={() => {
                    setHoveredSentenceIdx(null);
                    onHoverEvidence([]);
                  }}
                  onClick={() => onHoverEvidence(s.evidenceIds)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Sentence ${s.idx + 1}, cites ${s.citations.length} evidence items`}
                >
                  <p className={styles.sentenceText}>{s.text}</p>
                  <div className={styles.citationsList}>
                    {s.citations.map((c, ci) => (
                      <span key={ci} className={styles.citationTag}>
                        🔗 {c.sourceType === 'assessment_result' ? 'Assessment' : 'Observation'}
                      </span>
                    ))}
                    {s.citations.length === 0 && (
                      <span className={styles.citationTag} style={{ color: 'var(--color-danger)' }}>
                        ⚠️ No citation
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editable final text */}
        <div className={styles.editorArea}>
          <div className={styles.sectionTitle}>Teacher Review & Editing</div>
          <textarea
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Edit student progress comment..."
            aria-label="Progress report comment draft"
            id="textarea-comment-editor"
          />

          <div className={styles.editorMeta}>
            <span>
              {text.trim().split(/\s+/).filter(Boolean).length} words · {text.length} chars
            </span>
            <span>
              Edit distance: <strong>{currentEditDistance}</strong> chars modified
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.timer} title="Time spent in review">
          <span className={styles.timerDot} aria-hidden="true" />
          <span>Review time: {timerDisplay}</span>
        </div>

        <div className={styles.actionsRight}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleRegenerate}
            disabled={regenerating}
            id="btn-regenerate-comment"
          >
            {regenerating ? 'Regenerating...' : '🔄 Regenerate'}
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleSave}
            disabled={saving}
            id="btn-save-draft"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            type="button"
            className={styles.btnApprove}
            onClick={handleApprove}
            disabled={approving}
            id="btn-approve-comment"
          >
            {approving ? 'Approving...' : '✓ Approve Comment'}
          </button>
        </div>
      </div>
    </div>
  );
};

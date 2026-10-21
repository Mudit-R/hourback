import React from 'react';
import styles from './StatusChip.module.css';

type Status = 'draft' | 'edited' | 'approved' | 'flagged' | 'pending';

interface StatusChipProps {
  status: Status;
}

const LABELS: Record<Status, string> = {
  draft: 'Draft',
  edited: 'Edited',
  approved: 'Approved',
  flagged: 'Needs Review',
  pending: 'Pending',
};

export const StatusChip: React.FC<StatusChipProps> = ({ status }) => (
  <span className={`${styles.chip} ${styles[status]}`} aria-label={`Status: ${LABELS[status]}`}>
    {LABELS[status]}
  </span>
);

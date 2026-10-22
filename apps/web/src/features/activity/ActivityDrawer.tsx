import React from 'react';
import { useQuery } from '@apollo/client';
import { QUERY_ACTIVITY_FEED } from '../../graphql/authOperations';
import styles from './ActivityDrawer.module.css';

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  classId?: string;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  actor: string;
}

function formatRelativeTime(dateString: string): string {
  try {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'Recent';
  }
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'observation':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
    case 'report':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'enrollment':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      );
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
}

export const ActivityDrawer: React.FC<ActivityDrawerProps> = ({ isOpen, onClose, classId }) => {
  const { data, loading } = useQuery(QUERY_ACTIVITY_FEED, {
    variables: { classId },
    skip: !isOpen,
    pollInterval: 10000,
  });

  if (!isOpen) return null;

  const activities: ActivityItem[] = data?.activityFeed ?? [];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>System Updates & Audit</h2>
            <span className={styles.badge}>Live Feed</span>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close activity drawer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.feed}>
          {loading && activities.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>Loading updates...</div>
              <div className={styles.emptySub}>Synchronizing institutional audit records</div>
            </div>
          ) : activities.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>No recent activity</div>
              <div className={styles.emptySub}>Audit logs will populate as teachers record scores and notes</div>
            </div>
          ) : (
            activities.map((item) => (
              <div key={item.id} className={styles.feedItem}>
                <div className={styles.iconWrap}>{getActivityIcon(item.type)}</div>
                <div className={styles.itemContent}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemTitle}>{item.title}</span>
                    <span className={styles.itemTime}>{formatRelativeTime(item.timestamp)}</span>
                  </div>
                  <p className={styles.itemDesc}>{item.description}</p>
                  <div className={styles.itemMeta}>
                    <span>Actor: {item.actor}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

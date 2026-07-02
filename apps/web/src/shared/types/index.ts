// Shared cross-feature types — only what the app actually consumes lives here (domain types come
// from `@heist-mind/database` directly; this file must never re-export them, or it would launder
// the provider factories past the data-seam boundary rule).

// Loading/error envelope for the Zustand stores.
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated?: Date;
}

// Notification types (the notification store + NotificationToaster).
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

'use client';

import { useShallow } from 'zustand/react/shallow';
import { Alert, Text } from '@heist-mind/ui';
import { useNotificationStore } from '@/shared/stores/notification-store';
import type { NotificationType } from '@/shared/types';

const ALERT_VARIANT: Record<NotificationType, 'success' | 'destructive' | 'warning' | 'info'> = {
  success: 'success',
  error: 'destructive',
  warning: 'warning',
  info: 'info',
};

/**
 * Renders the notification store as dismissible toasts (bottom-right overlay). The store existed
 * before anything subscribed to it — wizard toasts were dispatched into the void (F58); this is the
 * single mount point (see `Providers`). Successes/warnings auto-expire via the store's timer;
 * errors are persistent until dismissed. The container is pointer-transparent so a toast never
 * blocks clicks on the page beneath it (only the alerts themselves are interactive).
 */
export function NotificationToaster() {
  const { notifications, remove } = useNotificationStore(
    useShallow(s => ({ notifications: s.notifications, remove: s.remove }))
  );

  if (notifications.length === 0) return null;

  return (
    <div className='pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2'>
      {notifications.map(n => (
        <Alert
          key={n.id}
          variant={ALERT_VARIANT[n.type]}
          size='sm'
          dismissible
          onDismiss={() => remove(n.id)}
          className='pointer-events-auto shadow-lg'
        >
          <Text size='sm' as='strong'>
            {n.title}
          </Text>
          {n.message && (
            <Text size='sm' variant='muted' className='block'>
              {n.message}
            </Text>
          )}
        </Alert>
      ))}
    </div>
  );
}

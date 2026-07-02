import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { type Notification } from '../types';

interface NotificationStore {
  notifications: Notification[];
  add: (notification: Omit<Notification, 'id'>) => void;
  remove: (id: string) => void;
  clear: () => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    (set, get) => ({
      notifications: [],

      add: notification => {
        const id = crypto.randomUUID();
        const newNotification: Notification = {
          id,
          duration: 5000, // Default 5 seconds
          ...notification,
        };

        set(state => ({
          notifications: [...state.notifications, newNotification],
        }));

        // Auto-remove after duration if not persistent
        if (!newNotification.persistent && newNotification.duration) {
          setTimeout(() => {
            get().remove(id);
          }, newNotification.duration);
        }
      },

      remove: id => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id),
        }));
      },

      clear: () => {
        set({ notifications: [] });
      },

      success: (title, message) => {
        get().add({ type: 'success', title, message });
      },

      error: (title, message) => {
        get().add({ type: 'error', title, message, persistent: true });
      },

      warning: (title, message) => {
        get().add({ type: 'warning', title, message });
      },

      info: (title, message) => {
        get().add({ type: 'info', title, message });
      },
    }),
    {
      name: 'notification-store',
    }
  )
);

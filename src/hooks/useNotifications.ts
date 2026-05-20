import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationCategory = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  type: NotificationCategory;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
}

interface NotificationStore {
  notifications: AppNotification[];
  addNotification: (type: NotificationCategory, title: string, message: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  unreadCount: () => number;
  hasCriticalUnread: () => boolean;
}

export const useNotifications = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      addNotification: (type, title, message) => {
        const newNotification: AppNotification = {
          id: crypto.randomUUID(),
          type,
          title,
          message,
          timestamp: Date.now(),
          isRead: false,
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }));
      },
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        }));
      },
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        }));
      },
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },
      clearAll: () => {
        set({ notifications: [] });
      },
      unreadCount: () => {
        return get().notifications.filter((n) => !n.isRead).length;
      },
      hasCriticalUnread: () => {
        return get().notifications.some((n) => !n.isRead && (n.type === 'error' || n.type === 'warning'));
      }
    }),
    {
      name: 'vc-notifications',
    }
  )
);

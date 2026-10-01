import { apiClient } from '../api/api-client';
import { authStore } from '../auth/auth-store';
import { realtime, type RealtimeNotification } from '../realtime/socket';
import type { ApiSuccess } from '../../types/api';

export type NotificationType = RealtimeNotification['type'];

export interface AppNotification {
  id: string;
  actorName: string;
  actorInitial: string;
  actorAvatarUrl?: string | null | undefined;
  type: NotificationType;
  entityId: string;
  contentSnippet?: string | undefined;
  createdAt: string;
  read: boolean;
}

interface NotificationList {
  items: RealtimeNotification[];
  unreadCount: number;
  page: number;
  limit: number;
  total: number;
  pages: number;
}

type NotificationListener = (notifications: AppNotification[]) => void;

function mapNotification(item: RealtimeNotification): AppNotification {
  const actorName = item.actor?.name || 'ผู้ใช้';
  return {
    id: item.id,
    actorName,
    actorInitial: actorName.charAt(0).toUpperCase() || 'ส',
    actorAvatarUrl: item.actor?.avatarUrl ?? null,
    type: item.type,
    entityId: item.entityId ?? '',
    ...(item.content ? { contentSnippet: item.content } : {}),
    createdAt: item.createdAt,
    read: item.read,
  };
}

class NotificationStore {
  private notifications: AppNotification[] = [];
  private readonly listeners = new Set<NotificationListener>();
  private loadingForUser: string | null = null;

  constructor() {
    authStore.subscribe((state) => {
      if (state.status === 'authenticated' && state.user) {
        if (this.loadingForUser !== state.user._id) {
          this.loadingForUser = state.user._id;
          void this.refresh();
        }
      } else {
        this.loadingForUser = null;
        this.notifications = [];
        this.notify();
      }
    });

    realtime.onNotification((notification) => {
      if (notification.recipientId !== authStore.snapshot.user?._id) return;
      const mapped = mapNotification(notification);
      this.notifications = [mapped, ...this.notifications.filter((item) => item.id !== mapped.id)];
      this.notify();
    });
  }

  private notify(): void {
    for (const listener of this.listeners) listener([...this.notifications]);
  }

  async refresh(): Promise<void> {
    if (authStore.snapshot.status !== 'authenticated') return;
    try {
      const result = await apiClient.request<ApiSuccess<NotificationList>>('/notifications?limit=50');
      this.notifications = result.data.items.map(mapNotification);
      this.notify();
    } catch {
      // Keep the latest successfully loaded notifications.
    }
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    listener([...this.notifications]);
    return () => this.listeners.delete(listener);
  }

  getAll(): AppNotification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter((item) => !item.read).length;
  }

  markAsRead(notificationId: string): void {
    const item = this.notifications.find((notification) => notification.id === notificationId);
    if (!item || item.read) return;
    item.read = true;
    this.notify();
    void apiClient.request(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PATCH' })
      .catch(() => {
        item.read = false;
        this.notify();
      });
  }

  markAllAsRead(): void {
    const previous = this.notifications.map((item) => item.read);
    this.notifications.forEach((item) => { item.read = true; });
    this.notify();
    void apiClient.request('/notifications/read-all', { method: 'PATCH' }).catch(() => {
      this.notifications.forEach((item, index) => { item.read = previous[index] ?? item.read; });
      this.notify();
    });
  }
}

export const notificationStore = new NotificationStore();

import { authStore } from '../auth/auth-store';

export type NotificationType = 'like' | 'comment' | 'reply';

export interface AppNotification {
  id: string;
  recipientId?: string | undefined;
  recipientName?: string | undefined;
  actorName: string;
  actorInitial: string;
  type: NotificationType;
  postId: string;
  postSnippet?: string | undefined;
  contentSnippet?: string | undefined;
  createdAt: string;
  read: boolean;
}

type NotificationListener = (notifications: AppNotification[]) => void;

class NotificationStore {
  private notifications: AppNotification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private initialized = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.loadFromStorage();

    // Re-load when auth state changes (switching accounts)
    authStore.subscribe(() => {
      this.loadFromStorage();
    });
  }

  private getStorageKey(): string {
    const user = authStore.snapshot.user;
    return user?._id ? `user_notifications_${user._id}` : 'user_notifications_guest';
  }

  private loadFromStorage(): void {
    const key = this.getStorageKey();
    try {
      const raw = localStorage.getItem(key);
      const stored: unknown = raw ? JSON.parse(raw) : [];
      const items: unknown[] = Array.isArray(stored) ? stored as unknown[] : [];
      this.notifications = items.filter((item): item is AppNotification => item !== null
        && typeof item === 'object'
        && 'id' in item
        && typeof item.id === 'string'
        && !/^notif_demo_[123]$/.test(item.id));
      if (this.notifications.length !== items.length) this.persist();
    } catch {
      this.notifications = [];
    }
    this.notify();
  }

  private persist(): void {
    const key = this.getStorageKey();
    try {
      localStorage.setItem(key, JSON.stringify(this.notifications));
    } catch {
      // ignore
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener([...this.notifications]);
    }
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    listener([...this.notifications]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getAll(): AppNotification[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  public markAsRead(notificationId: string): void {
    const notif = this.notifications.find((n) => n.id === notificationId);
    if (notif && !notif.read) {
      notif.read = true;
      this.persist();
      this.notify();
    }
  }

  public markAllAsRead(): void {
    let changed = false;
    this.notifications.forEach((n) => {
      if (!n.read) {
        n.read = true;
        changed = true;
      }
    });
    if (changed) {
      this.persist();
      this.notify();
    }
  }

  /**
   * Add a new notification (sent to target user's storage)
   */
  public addNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): void {
    const targetUserId = notification.recipientId;
    const targetKey = targetUserId ? `user_notifications_${targetUserId}` : 'user_notifications_guest';

    const newNotif: AppNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    // If current user is the recipient (e.g. testing or local post)
    const currentUserId = authStore.snapshot.user?._id;
    if (!targetUserId || targetUserId === currentUserId) {
      this.notifications.unshift(newNotif);
      this.persist();
      this.notify();
    } else {
      // Save directly to the recipient's storage box
      try {
        const raw = localStorage.getItem(targetKey);
        const list = raw ? (JSON.parse(raw) as AppNotification[]) : [];
        list.unshift(newNotif);
        localStorage.setItem(targetKey, JSON.stringify(list));
      } catch {
        // ignore
      }
    }
  }
}

export const notificationStore = new NotificationStore();

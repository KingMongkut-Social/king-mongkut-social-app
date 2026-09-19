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
      if (raw) {
        this.notifications = JSON.parse(raw) as AppNotification[];
      } else {
        // Provide mock initial demo notifications for the current user
        const currentUser = authStore.snapshot.user;
        const currentName = currentUser?.name || 'คุณ';
        this.notifications = [
          {
            id: 'notif_demo_1',
            recipientId: currentUser?._id,
            recipientName: currentName,
            actorName: 'David Chen (KMUTT)',
            actorInitial: 'D',
            type: 'like',
            postId: 'sample_1',
            postSnippet: 'เปิดตัวโครงงานระบบมอนิเตอร์ IoT',
            createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            read: false,
          },
          {
            id: 'notif_demo_2',
            recipientId: currentUser?._id,
            recipientName: currentName,
            actorName: 'iamaxm',
            actorInitial: 'I',
            type: 'comment',
            postId: 'sample_1',
            postSnippet: 'เปิดตัวโครงงานระบบมอนิเตอร์ IoT',
            contentSnippet: 'น่าสนใจมากครับ อยากนำไปทดลองใช้งานจริง',
            createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            read: false,
          },
          {
            id: 'notif_demo_3',
            recipientId: currentUser?._id,
            recipientName: currentName,
            actorName: 'Emily Rodriguez (KMUTNB)',
            actorInitial: 'E',
            type: 'reply',
            postId: 'sample_1',
            postSnippet: 'เปิดตัวโครงงานระบบมอนิเตอร์ IoT',
            contentSnippet: 'เห็นด้วยเลยค่ะ ลองดูในแล็บสถาบันได้เลย',
            createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
            read: true,
          },
        ];
        this.persist();
      }
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

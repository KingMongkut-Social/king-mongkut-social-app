import { notificationStore, type AppNotification } from '../../core/notifications/notification-store';
import type { PageView } from '../../core/router/router';
import { clear, el } from '../../core/ui/dom';
import { createEmptyState } from '../../core/ui/feedback';
import { createAvatar } from '../../core/ui/avatar';
import { createNotificationTypeBadge } from '../../core/ui/notification-icon';
import { formatRelativeTime } from '../../core/utils/format';

export function notificationsPage(): PageView {
  const root = el('section', { className: 'platform-page notifications-page' });
  const headingRow = el('div', { className: 'platform-heading-row' });
  headingRow.append(el('h1', { className: 'platform-title', text: 'การแจ้งเตือน' }));

  const markAllBtn = el('button', {
    className: 'button button--secondary button--small',
    attrs: { type: 'button' },
    text: 'อ่านทั้งหมดแล้ว',
  });
  markAllBtn.addEventListener('click', () => notificationStore.markAllAsRead());
  headingRow.append(markAllBtn);
  root.append(headingRow);

  const filterTabs = el('div', { className: 'search-tabs', attrs: { role: 'tablist', 'aria-label': 'ตัวกรองการแจ้งเตือน' } });
  const allTab = el('button', {
    className: 'search-tab-btn search-tab-btn--active',
    attrs: { type: 'button', role: 'tab', 'aria-selected': 'true' },
    text: 'ทั้งหมด',
  });
  const unreadTab = el('button', {
    className: 'search-tab-btn',
    attrs: { type: 'button', role: 'tab', 'aria-selected': 'false' },
    text: 'ยังไม่ได้อ่าน',
  });
  filterTabs.append(allTab, unreadTab);
  root.append(filterTabs);

  const listContainer = el('div', { className: 'search-section', attrs: { role: 'feed' } });
  root.append(listContainer);

  let filterUnread = false;

  const render = (notifications: AppNotification[]) => {
    clear(listContainer);
    const filtered = filterUnread ? notifications.filter((n) => !n.read) : notifications;

    if (filtered.length === 0) {
      listContainer.append(createEmptyState({
        title: filterUnread ? 'ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน' : 'ยังไม่มีการแจ้งเตือน',
        description: 'การแจ้งเตือนเกี่ยวกับกิจกรรม โพสต์ หรือคำขอเพื่อนของคุณจะปรากฏที่นี่',
      }));
      return;
    }

    filtered.forEach((n) => {
      let target = '/';
      if (n.type === 'post_reaction' || n.type === 'post_comment' || n.type === 'comment_reply') {
        target = n.postId ? `/posts/${encodeURIComponent(n.postId)}` : '/';
      } else if (n.type === 'friend_request' || n.type === 'friend_accept') {
        target = '/connections';
      } else if (n.type === 'group_invite') {
        target = '/groups';
      } else if (n.type === 'group_join') {
        target = n.postId ? `/groups/${encodeURIComponent(n.postId)}` : '/groups';
      }

      const item = el('a', {
        className: `notification-item ${!n.read ? 'notification-item--unread' : ''}`,
        attrs: {
          href: target,
          style: 'border-radius: var(--radius-md); margin-bottom: 2px; text-decoration: none;',
        },
      });

      const avatarWrap = el('div', { className: 'notification-avatar-wrap' });
      const avatar = createAvatar({
        url: n.actorAvatarUrl,
        name: n.actorName,
        size: 'md',
        className: 'notification-avatar',
      });
      const typeBadge = createNotificationTypeBadge(n.type);
      avatarWrap.append(avatar, typeBadge);

      const body = el('div', { className: 'notification-body' });
      const textLine = el('div', { className: 'notification-text' });
      const actor = el('span', { className: 'notification-actor', text: n.actorName });
      textLine.append(actor);

      let actionDesc = '';
      if (n.type === 'post_reaction') actionDesc = ' มีปฏิกิริยาต่อโพสต์ของคุณ';
      else if (n.type === 'post_comment') actionDesc = ' แสดงความคิดเห็นบนโพสต์ของคุณ';
      else if (n.type === 'comment_reply') actionDesc = ' ตอบกลับความคิดเห็นของคุณ';
      else if (n.type === 'friend_request') actionDesc = ' ส่งคำขอเป็นเพื่อนถึงคุณ';
      else if (n.type === 'friend_accept') actionDesc = ' ตอบรับคำขอเป็นเพื่อนของคุณ';
      else if (n.type === 'group_join') actionDesc = ' เข้าร่วมกลุ่มของคุณ';
      else if (n.type === 'group_invite') actionDesc = ' เชิญคุณเข้าร่วมกลุ่ม';
      else actionDesc = ' มีกิจกรรมใหม่';
      textLine.append(document.createTextNode(actionDesc));

      if (n.contentSnippet) {
        textLine.append(el('span', { className: 'notification-snippet', text: `“${n.contentSnippet}”` }));
      }

      body.append(textLine, el('div', { className: 'notification-time', text: formatRelativeTime(n.createdAt) }));
      item.append(avatarWrap, body);

      if (!n.read) {
        item.append(el('span', { className: 'notification-unread-dot' }));
      }

      item.addEventListener('click', (e) => {
        e.preventDefault();
        notificationStore.markAsRead(n.id);
        window.history.pushState(null, '', target);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      listContainer.append(item);
    });
  };

  const unsubscribe = notificationStore.subscribe((notifications) => {
    render(notifications);
  });

  allTab.addEventListener('click', () => {
    filterUnread = false;
    allTab.classList.add('search-tab-btn--active');
    unreadTab.classList.remove('search-tab-btn--active');
    allTab.setAttribute('aria-selected', 'true');
    unreadTab.setAttribute('aria-selected', 'false');
    render(notificationStore.getAll());
  });

  unreadTab.addEventListener('click', () => {
    filterUnread = true;
    unreadTab.classList.add('search-tab-btn--active');
    allTab.classList.remove('search-tab-btn--active');
    unreadTab.setAttribute('aria-selected', 'true');
    allTab.setAttribute('aria-selected', 'false');
    render(notificationStore.getAll());
  });

  return {
    title: 'การแจ้งเตือน',
    element: root,
    dispose: unsubscribe,
  };
}

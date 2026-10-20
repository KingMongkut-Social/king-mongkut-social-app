import { authStore } from '../../core/auth/auth-store';
import { el } from '../../core/ui/dom';
import { reactIcon, type AppIconName } from '../../core/ui/react-icon';
import { createAvatar, createUniversityBadge } from '../../core/ui/avatar';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import type { PostReaction, PostReactionUser } from '../../types/api';
import { getFriendUser, respondFriendRequest, sendFriendRequest, type FriendUser } from '../friends/friends-api';
import { openProfilePreviewModal } from '../profile/profile-modal';
import { postsApi } from './posts-api';

interface ReactionMeta {
  value: PostReaction;
  icon: AppIconName;
  label: string;
}

const REACTIONS_META: ReadonlyArray<ReactionMeta> = [
  { value: 'LIKE', icon: 'thumbs-up', label: 'ถูกใจ' },
  { value: 'LOVE', icon: 'heart', label: 'รักเลย' },
  { value: 'HAHA', icon: 'laugh', label: 'ฮ่าๆ' },
  { value: 'WOW', icon: 'surprise', label: 'ว้าว' },
  { value: 'SAD', icon: 'sad', label: 'เศร้า' },
  { value: 'ANGRY', icon: 'angry', label: 'โกรธ' },
];

export function openReactionsModal(postId: string, initialTab: 'ALL' | PostReaction = 'ALL'): void {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'reactions-modal', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'คนที่แสดงความรู้สึก' } });

  const closeModal = (): void => {
    document.removeEventListener('keydown', handleEsc);
    overlay.remove();
    document.body.style.overflow = '';
  };

  const handleEsc = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleEsc);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Header
  const header = el('div', { className: 'reactions-modal__header' });
  const title = el('h3', { className: 'reactions-modal__title', text: 'คนที่แสดงความรู้สึก' });
  const closeBtn = el('button', {
    className: 'reactions-modal__close-btn',
    attrs: { type: 'button', 'aria-label': 'ปิด', title: 'ปิด' },
  });
  closeBtn.append(reactIcon('close', { size: 16 }));
  closeBtn.addEventListener('click', closeModal);
  header.append(title, closeBtn);

  // Tabs container
  const tabsWrap = el('div', { className: 'reactions-modal__tabs', attrs: { role: 'tablist' } });

  // List container
  const listContainer = el('div', { className: 'reactions-modal__body' });

  let currentTab: 'ALL' | PostReaction = initialTab;
  let cachedCounts: Record<PostReaction, number> = { LIKE: 0, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0 };
  let cachedTotal = 0;

  const renderTabs = (): void => {
    tabsWrap.innerHTML = '';

    // "ทั้งหมด" Tab
    const allTabBtn = el('button', {
      className: `reactions-modal__tab ${currentTab === 'ALL' ? 'reactions-modal__tab--active' : ''}`,
      attrs: { type: 'button', role: 'tab', 'aria-selected': String(currentTab === 'ALL') },
    });
    allTabBtn.append(el('span', { text: `ทั้งหมด ${cachedTotal > 0 ? cachedTotal : ''}`.trim() }));
    allTabBtn.addEventListener('click', () => {
      if (currentTab === 'ALL') return;
      currentTab = 'ALL';
      renderTabs();
      void loadReactions();
    });
    tabsWrap.append(allTabBtn);

    // Each Reaction Tab
    for (const meta of REACTIONS_META) {
      const count = cachedCounts[meta.value] ?? 0;
      if (count === 0 && cachedTotal > 0) continue; // Only show reactions with count > 0 if counts known

      const tabBtn = el('button', {
        className: `reactions-modal__tab reactions-modal__tab--${meta.value.toLowerCase()} ${
          currentTab === meta.value ? 'reactions-modal__tab--active' : ''
        }`,
        attrs: { type: 'button', role: 'tab', 'aria-selected': String(currentTab === meta.value) },
      });
      const iconWrap = el('span', { className: 'reactions-modal__tab-icon' });
      iconWrap.append(reactIcon(meta.icon, { size: 14 }));
      tabBtn.append(iconWrap, el('span', { text: count > 0 ? ` ${count}` : '' }));
      tabBtn.setAttribute('title', `${meta.label} (${count})`);

      tabBtn.addEventListener('click', () => {
        if (currentTab === meta.value) return;
        currentTab = meta.value;
        renderTabs();
        void loadReactions();
      });
      tabsWrap.append(tabBtn);
    }
  };

  const createReactionUserRow = (item: PostReactionUser): HTMLElement => {
    const row = el('div', { className: 'reactions-user-row' });
    const user = item.user;
    const authorId = typeof user === 'string' ? user : user?._id || '';
    const authorName = typeof user === 'string' ? 'นักศึกษา' : user?.name || 'นักศึกษา';
    const authorUni = typeof user === 'object' && user?.university ? user.university : undefined;
    const authorFaculty = typeof user === 'object' && user?.faculty ? user.faculty : '';
    const authorDept = typeof user === 'object' && user?.department ? user.department : '';
    const avatarUrl = typeof user === 'object' && user?.avatarUrl ? user.avatarUrl : undefined;

    const currentUser = authStore.snapshot.user;
    const isMine = Boolean(currentUser && currentUser._id === authorId);

    // Avatar wrapper with mini reaction badge
    const avatarWrap = el('div', { className: 'reactions-user-avatar-wrap' });
    const avatar = createAvatar({
      url: avatarUrl,
      name: authorName,
      size: 'md',
      className: 'reactions-user-avatar',
    });
    avatar.style.cursor = 'pointer';

    const reactionMetaItem: ReactionMeta = REACTIONS_META.find((m) => m.value === item.reaction) ?? {
      value: 'LIKE',
      icon: 'thumbs-up',
      label: 'ถูกใจ',
    };
    const badgeIcon = el('div', {
      className: `reactions-user-badge reactions-user-badge--${item.reaction.toLowerCase()}`,
      attrs: { title: reactionMetaItem.label },
    });
    badgeIcon.append(reactIcon(reactionMetaItem.icon, { size: 10 }));

    avatarWrap.append(avatar, badgeIcon);

    // User details
    const details = el('div', { className: 'reactions-user-details' });
    const nameLine = el('div', { className: 'reactions-user-name-line' });
    const nameEl = el('span', { className: 'reactions-user-name', text: authorName });
    nameLine.append(nameEl);
    if (authorUni) {
      nameLine.append(createUniversityBadge(authorUni));
    }

    const deptLine = el('div', { className: 'reactions-user-dept' });
    const deptText = [authorDept, authorFaculty].filter(Boolean).join(' • ');
    deptLine.textContent = deptText || 'นักศึกษา 3 พระจอมฯ';

    details.append(nameLine, deptLine);

    const openProfile = () => {
      openProfilePreviewModal({
        ...(authorId ? { authorId } : {}),
        name: authorName,
        ...(authorUni ? { university: authorUni } : {}),
        ...(authorFaculty ? { faculty: authorFaculty } : {}),
        ...(authorDept ? { department: authorDept } : {}),
        isMine,
      });
    };

    avatarWrap.addEventListener('click', openProfile);
    details.addEventListener('click', openProfile);
    details.style.cursor = 'pointer';

    row.append(avatarWrap, details);

    // Friend / Chat Action Button on the right
    if (isMine) {
      const youBadge = el('span', { className: 'reactions-user-you-tag', text: 'คุณ' });
      row.append(youBadge);
    } else if (authorId && /^[a-f\d]{24}$/i.test(authorId)) {
      let currentFriendStatus: FriendUser['relationshipStatus'] = 'none';
      let requestId: string | null = null;

      const friendBtn = el('button', {
        className: 'reactions-friend-btn',
        attrs: { type: 'button' },
      });

      const syncStatus = (newStatus: FriendUser['relationshipStatus']) => {
        currentFriendStatus = newStatus;
        friendBtn.className = `reactions-friend-btn ${
          newStatus === 'friends'
            ? 'reactions-friend-btn--friend'
            : newStatus === 'pending_sent'
            ? 'reactions-friend-btn--pending'
            : 'reactions-friend-btn--add'
        }`;
        friendBtn.textContent =
          authStore.snapshot.status !== 'authenticated'
            ? 'เข้าสู่ระบบ'
            : newStatus === 'friends'
            ? 'แชท'
            : newStatus === 'pending_sent'
            ? 'ส่งคำขอแล้ว'
            : newStatus === 'pending_received'
            ? 'ยอมรับ'
            : '+ เพื่อน';
        friendBtn.disabled = newStatus === 'pending_sent';
      };
      syncStatus(currentFriendStatus);

      friendBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (authStore.snapshot.status !== 'authenticated') {
          closeModal();
          window.history.pushState(null, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
          return;
        }
        if (currentFriendStatus === 'pending_sent') return;
        if (currentFriendStatus === 'friends') {
          closeModal();
          window.history.pushState(null, '', `/chat?userId=${encodeURIComponent(authorId)}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
          return;
        }
        friendBtn.disabled = true;
        friendBtn.textContent = '...';
        try {
          const latest = await getFriendUser(authorId);
          requestId = latest.requestId;
          currentFriendStatus = latest.relationshipStatus;
          if (currentFriendStatus === 'pending_received' && requestId) {
            await respondFriendRequest(requestId, 'accept');
            currentFriendStatus = 'friends';
            toast.success('เป็นเพื่อนกันแล้ว');
          } else if (currentFriendStatus === 'none') {
            await sendFriendRequest(authorId);
            currentFriendStatus = 'pending_sent';
            toast.success(`ส่งคำขอเป็นเพื่อนแล้ว`);
          }
        } catch (cause) {
          toast.error(errorMessage(cause));
        } finally {
          syncStatus(currentFriendStatus);
        }
      });

      row.append(friendBtn);

      if (authStore.snapshot.status === 'authenticated') {
        void getFriendUser(authorId).then((friend) => {
          requestId = friend.requestId;
          syncStatus(friend.relationshipStatus);
        }).catch(() => undefined);
      }
    }

    return row;
  };

  const loadReactions = async (): Promise<void> => {
    listContainer.innerHTML = '';
    const loadingEl = el('div', { className: 'reactions-modal__loading', text: 'กำลังโหลดรายชื่อ...' });
    listContainer.append(loadingEl);

    try {
      const filter = currentTab === 'ALL' ? undefined : currentTab;
      const response = await postsApi.listReactions(postId, filter, 1, 100);
      cachedCounts = response.data.reactionCounts;
      cachedTotal = response.data.totalReactions ?? response.data.total;
      renderTabs();

      listContainer.innerHTML = '';
      if (!response.data.items || response.data.items.length === 0) {
        const emptyEl = el('div', { className: 'reactions-modal__empty', text: 'ยังไม่มีคนแสดงความรู้สึกในหมวดนี้' });
        listContainer.append(emptyEl);
        return;
      }

      for (const item of response.data.items) {
        listContainer.append(createReactionUserRow(item));
      }
    } catch (err) {
      listContainer.innerHTML = '';
      const errorEl = el('div', { className: 'reactions-modal__empty', text: errorMessage(err) });
      listContainer.append(errorEl);
    }
  };

  renderTabs();
  void loadReactions();

  modal.append(header, tabsWrap, listContainer);
  overlay.append(modal);
  document.body.style.overflow = 'hidden';
  document.body.append(overlay);
}

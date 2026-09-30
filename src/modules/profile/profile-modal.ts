import { authStore } from '../../core/auth/auth-store';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { getFriendUser, respondFriendRequest, searchFriends, sendFriendRequest, type FriendUser } from '../friends/friends-api';

export interface OpenProfileModalOptions {
  authorId?: string;
  name: string;
  university?: string;
  faculty?: string;
  department?: string;
  avatarLetter?: string;
  isMine?: boolean;
  relationshipStatus?: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  onFriendStatusChange?: (newStatus: FriendUser['relationshipStatus']) => void;
}

function uniqueExactMatch(users: FriendUser[], name: string): FriendUser | undefined {
  const matches = users.filter((user) => user.name.toLowerCase() === name.toLowerCase());
  return matches.length === 1 ? matches[0] : undefined;
}

export function openProfilePreviewModal(options: OpenProfileModalOptions): void {
  const currentUser = authStore.snapshot.user;
  const isSelf = Boolean(
    options.isMine ||
    (currentUser && options.authorId && currentUser._id === options.authorId)
  );

  const userName = options.name || (currentUser?.name || 'ผู้ใช้');
  let university = options.university || '3 พระจอมฯ';
  let faculty = options.faculty || 'ยังไม่ระบุคณะ';
  let department = options.department || 'ยังไม่ระบุภาควิชา';
  let targetUserId = options.authorId && /^[a-f\d]{24}$/i.test(options.authorId) ? options.authorId : '';
  let relationshipStatus: FriendUser['relationshipStatus'] = options.relationshipStatus || 'none';
  let requestId: string | null = null;

  // Modal DOM Elements
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'profile-preview-modal' });

  const closeModal = () => {
    document.removeEventListener('keydown', handleEsc);
    overlay.remove();
    document.body.style.overflow = '';
  };

  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleEsc);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const goToFullProfile = () => {
    void (async () => {
      let profileId = isSelf ? currentUser?._id : targetUserId;
      if (!profileId && authStore.snapshot.status === 'authenticated') {
        try {
          const matches = await searchFriends(userName);
          profileId = uniqueExactMatch(matches, userName)?.id;
        } catch (cause) {
          toast.error(errorMessage(cause));
          return;
        }
      }
      if (!profileId) {
        toast.error('ไม่พบโปรไฟล์ของผู้ใช้นี้');
        return;
      }
      closeModal();
      window.history.pushState(null, '', `/profile/${encodeURIComponent(profileId)}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    })();
  };

  // Close Button (✕)
  const closeBtn = el('button', {
    className: 'icon-btn profile-preview-modal__close-btn',
    attrs: { type: 'button', 'aria-label': 'ปิด' },
    text: '✕',
  });
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });

  // Banner
  const banner = el('div', { className: 'profile-preview-modal__banner' });
  banner.append(closeBtn);

  // Modal Body
  const body = el('div', { className: 'profile-preview-modal__body' });

  // Top row: Avatar & Action Button / Badge
  const topRow = el('div', { className: 'profile-preview-modal__top-row' });

  const avatarLetter = options.avatarLetter || userName.charAt(0).toUpperCase() || 'U';
  const avatarEl = el('div', {
    className: 'profile-large-avatar profile-preview-modal__avatar',
    attrs: { title: `คลิกเพื่อเปิดหน้าโปรไฟล์ฉบับเต็มของ ${userName}` },
    text: avatarLetter,
  });
  avatarEl.addEventListener('click', (e) => {
    e.stopPropagation();
    goToFullProfile();
  });

  const actionSlot = el('div', { className: 'profile-preview-modal__action-slot' });
  let renderAction: (() => void) | undefined;

  if (isSelf) {
    const selfBadge = el('div', {
      attrs: {
        style:
          'padding:6px 14px; background:#f5f0ea; color:#554c44; border-radius:20px; font-size:0.82rem; font-weight:700;',
      },
      text: '👤 โปรไฟล์ของคุณ',
    });
    actionSlot.append(selfBadge);
  } else {
    const friendBtn = el('button', {
      attrs: { type: 'button' },
      className: 'profile-friend-btn',
    });

    const renderFriendButton = () => {
      const status = authStore.snapshot.status;
      friendBtn.className = `profile-friend-btn ${
        relationshipStatus === 'friends'
          ? 'profile-friend-btn--friend'
          : relationshipStatus === 'pending_sent'
          ? 'profile-friend-btn--pending'
          : 'profile-friend-btn--add'
      }`;
      friendBtn.textContent = status !== 'authenticated'
        ? 'เข้าสู่ระบบเพื่อเพิ่มเพื่อน'
        : !targetUserId
        ? 'ไม่พบผู้ใช้สำหรับเพิ่มเพื่อน'
        : relationshipStatus === 'friends'
        ? 'แชท'
        : relationshipStatus === 'pending_sent'
        ? 'ส่งคำขอแล้ว'
        : relationshipStatus === 'pending_received'
        ? 'ยอมรับคำขอ'
        : '+ เพิ่มเพื่อน';
      friendBtn.disabled = status === 'authenticated' && (
        !targetUserId || relationshipStatus === 'pending_sent'
        || (relationshipStatus === 'pending_received' && !requestId)
      );
    };
    renderAction = renderFriendButton;

    friendBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (authStore.snapshot.status !== 'authenticated') {
        closeModal();
        window.history.pushState(null, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
      if (!targetUserId) return;
      if (relationshipStatus === 'friends') {
        closeModal();
        window.history.pushState(null, '', `/chat?userId=${encodeURIComponent(targetUserId)}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
      if (relationshipStatus === 'pending_sent') return;
      friendBtn.disabled = true;
      friendBtn.textContent = 'กำลังดำเนินการ...';
      try {
        if (relationshipStatus === 'pending_received' && requestId) {
          await respondFriendRequest(requestId, 'accept');
          relationshipStatus = 'friends';
          toast.success('เป็นเพื่อนกันแล้ว');
        } else {
          await sendFriendRequest(targetUserId);
          relationshipStatus = 'pending_sent';
          toast.success(`ส่งคำขอเป็นเพื่อนไปยัง ${userName} แล้ว`);
        }
        options.onFriendStatusChange?.(relationshipStatus);
      } catch (cause) {
        toast.error(errorMessage(cause));
      } finally {
        renderFriendButton();
      }
    });

    renderFriendButton();
    actionSlot.append(friendBtn);
  }

  topRow.append(avatarEl, actionSlot);

  // Info Section (Clickable to open big profile)
  const infoSection = el('div', {
    className: 'profile-preview-modal__info',
    attrs: { title: `คลิกเพื่อเปิดหน้าโปรไฟล์ฉบับเต็มของ ${userName}` },
  });
  infoSection.addEventListener('click', goToFullProfile);

  const nameRow = el('div', { className: 'profile-preview-modal__name-row' });
  const nameHeading = el('h2', { className: 'profile-preview-modal__name', text: userName });

  let badgeClass = 'badge-tag--tech-uni';
  if (university.includes('KMITL') || university.includes('ลาดกระบัง')) badgeClass = 'badge-tag--kmitl';
  else if (university.includes('KMUTT') || university.includes('บางมด')) badgeClass = 'badge-tag--kmutt';
  else if (university.includes('KMUTNB') || university.includes('พระนครเหนือ')) badgeClass = 'badge-tag--kmutnb';

  const uniBadge = el('span', { className: `badge-tag ${badgeClass}`, text: university });
  nameRow.append(nameHeading, uniBadge);

  const academicLine = el('div', {
    className: 'profile-academic-line',
    text: `${faculty} • ${department}`,
  });

  const bio = el('p', {
    className: 'profile-bio-text',
    text: isSelf ? 'โปรไฟล์ของคุณ' : `โปรไฟล์ของ ${userName}`,
  });

  infoSection.append(nameRow, academicLine, bio);

  // Footer CTA to open full page
  const footer = el('div', { className: 'profile-preview-modal__footer' });
  const ctaBtn = el('button', {
    className: 'button button--primary profile-preview-modal__cta-btn',
    attrs: { type: 'button' },
  });
  ctaBtn.innerHTML = `<span>ดูหน้าโปรไฟล์ฉบับเต็ม</span> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
  ctaBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    goToFullProfile();
  });
  footer.append(ctaBtn);

  body.append(topRow, infoSection, footer);
  modal.append(banner, body);
  overlay.append(modal);

  document.body.style.overflow = 'hidden';
  document.body.append(overlay);

  // Refresh the relationship from the API so a cached post cannot show a stale friend state.
  if (!isSelf && authStore.snapshot.status === 'authenticated') {
    const connection = targetUserId
      ? getFriendUser(targetUserId)
      : options.authorId
      ? Promise.resolve(undefined)
      : searchFriends(userName).then((users) => uniqueExactMatch(users, userName));
    void connection.then((matched) => {
      if (!overlay.isConnected) return;
      if (matched) {
        targetUserId = matched.id;
        relationshipStatus = matched.relationshipStatus;
        requestId = matched.requestId;
        if (matched.university && matched.university !== university) {
          university = matched.university;
          uniBadge.textContent = university;
        }
        if (matched.faculty) faculty = matched.faculty;
        if (matched.department) department = matched.department;
        academicLine.textContent = `${faculty} • ${department}`;
        renderAction?.();
        options.onFriendStatusChange?.(relationshipStatus);
      }
    }).catch(() => undefined);
  }
}

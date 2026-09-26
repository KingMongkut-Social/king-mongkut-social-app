import { authStore } from '../../core/auth/auth-store';
import { el } from '../../core/ui/dom';
import { toast } from '../../core/ui/toast';
import { searchFriends, sendFriendRequest } from '../friends/friends-api';

export interface OpenProfileModalOptions {
  authorId?: string;
  name: string;
  university?: string;
  faculty?: string;
  department?: string;
  avatarLetter?: string;
  isMine?: boolean;
  relationshipStatus?: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  onFriendStatusChange?: (newStatus: 'none' | 'pending_sent' | 'friends') => void;
}

export function openProfilePreviewModal(options: OpenProfileModalOptions): void {
  const currentUser = authStore.snapshot.user;
  const isSelf = Boolean(
    options.isMine ||
    (currentUser &&
      (currentUser._id === options.authorId ||
        (currentUser.name && currentUser.name.toLowerCase() === options.name.toLowerCase())))
  );

  let userName = options.name || (currentUser?.name || 'ผู้ใช้');
  let university = options.university || '3 พระจอมฯ';
  let faculty = options.faculty || 'คณะวิศวกรรมศาสตร์';
  let department = options.department || 'ภาควิชาวิศวกรรมคอมพิวเตอร์';
  let targetUserId = options.authorId || '';

  const targetKey = targetUserId || userName;
  const localFriendState = localStorage.getItem(`friend_status_${targetKey}`);
  let relationshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends' =
    localFriendState === 'friends' || localFriendState === 'pending_sent'
      ? localFriendState
      : options.relationshipStatus || 'none';

  // Check mock profile cache in localStorage
  try {
    const cached = localStorage.getItem(`mock_profile_${encodeURIComponent(targetKey)}`);
    if (cached) {
      const parsed = JSON.parse(cached) as { faculty?: string; department?: string; university?: string };
      if (parsed.faculty) faculty = parsed.faculty;
      if (parsed.department) department = parsed.department;
      if (parsed.university) university = parsed.university;
    }
  } catch {
    // ignore
  }

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
    closeModal();
    const profileParam = targetUserId || userName;
    window.history.pushState(null, '', `/profile/${encodeURIComponent(profileParam)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Close Button (✕)
  const closeBtn = el('button', {
    className: 'profile-preview-modal__close-btn',
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
      className: `profile-friend-btn ${
        relationshipStatus === 'friends'
          ? 'profile-friend-btn--friend'
          : relationshipStatus === 'pending_sent'
          ? 'profile-friend-btn--pending'
          : 'profile-friend-btn--add'
      }`,
      text:
        relationshipStatus === 'friends'
          ? '✓ เพื่อน'
          : relationshipStatus === 'pending_sent'
          ? 'ส่งคำขอแล้ว'
          : '+ เพิ่มเพื่อน',
    });

    friendBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (relationshipStatus === 'none') {
        friendBtn.disabled = true;
        friendBtn.textContent = 'กำลังส่ง...';
        try {
          if (targetUserId) {
            await sendFriendRequest(targetUserId);
          }
          localStorage.setItem(`friend_status_${targetKey}`, 'pending_sent');
          relationshipStatus = 'pending_sent';
          friendBtn.className = 'profile-friend-btn profile-friend-btn--pending';
          friendBtn.textContent = 'ส่งคำขอแล้ว';
          toast.success(`ส่งคำขอเป็นเพื่อนไปยัง ${userName} เรียบร้อยแล้ว`);
          if (options.onFriendStatusChange) {
            options.onFriendStatusChange('pending_sent');
          }
        } catch {
          localStorage.setItem(`friend_status_${targetKey}`, 'pending_sent');
          relationshipStatus = 'pending_sent';
          friendBtn.className = 'profile-friend-btn profile-friend-btn--pending';
          friendBtn.textContent = 'ส่งคำขอแล้ว';
          toast.success(`ส่งคำขอเป็นเพื่อนเรียบร้อยแล้ว`);
          if (options.onFriendStatusChange) {
            options.onFriendStatusChange('pending_sent');
          }
        }
      }
    });

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
    text: isSelf
      ? 'ยินดีต้อนรับสู่โปรไฟล์ของคุณ สามารถดูและจัดการผลงานรวมถึงโพสต์ทั้งหมดได้ที่นี่'
      : 'นักศึกษาในเครือข่าย 3 พระจอมเกล้า ยินดีที่ได้รู้จักและแลกเปลี่ยนความรู้ครับ!',
  });

  infoSection.append(nameRow, academicLine, bio);

  // Footer CTA to open full page
  const footer = el('div', { className: 'profile-preview-modal__footer' });
  const ctaBtn = el('button', {
    className: 'profile-preview-modal__cta-btn',
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

  // Asynchronously query friends for updated info if needed
  if (!isSelf && !options.authorId) {
    searchFriends().then((users) => {
      const matched = users.find(
        (u) =>
          u.id === userName ||
          (u.name && u.name.toLowerCase() === userName.toLowerCase()) ||
          userName.toLowerCase().includes(u.name.toLowerCase())
      );
      if (matched) {
        targetUserId = matched.id;
        if (matched.university && matched.university !== university) {
          university = matched.university;
          uniBadge.textContent = university;
        }
      }
    }).catch(() => {
      // ignore
    });
  }
}

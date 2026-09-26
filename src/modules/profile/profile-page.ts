import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { toast } from '../../core/ui/toast';
import { authorName } from '../../core/utils/format';
import type { Post } from '../../types/api';
import { searchFriends, sendFriendRequest } from '../friends/friends-api';
import { postsApi } from '../posts/posts-api';
import { postCard } from '../posts/post-components';

export async function profilePage(context: RouteContext): Promise<PageView> {
  const param = context.params.id || context.query.get('id') || '';
  const decodedParam = decodeURIComponent(param).trim();

  const currentUser = authStore.snapshot.user;
  const isSelf = Boolean(
    currentUser &&
    (currentUser._id === decodedParam ||
      (currentUser.name && currentUser.name.toLowerCase() === decodedParam.toLowerCase()))
  );

  let userName = decodedParam || (currentUser?.name || 'ผู้ใช้');
  let university = '3 พระจอมฯ';
  let faculty = 'คณะวิศวกรรมศาสตร์';
  let department = 'ภาควิชาวิศวกรรมคอมพิวเตอร์';
  let relationshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends' = 'none';
  let targetUserId = '';

  if (isSelf && currentUser) {
    userName = currentUser.name || 'คุณ';
    university = currentUser.university || 'KMITL';
    if (currentUser.faculty) faculty = currentUser.faculty;
    if (currentUser.department) department = currentUser.department;
  } else {
    // Try to find user from searchFriends
    try {
      const users = await searchFriends();
      const matched = users.find(
        (u) =>
          u.id === decodedParam ||
          (u.name && u.name.toLowerCase() === decodedParam.toLowerCase()) ||
          decodedParam.toLowerCase().includes(u.name.toLowerCase())
      );
      if (matched) {
        userName = matched.name;
        university = matched.university;
        relationshipStatus = matched.relationshipStatus;
        targetUserId = matched.id;
      }
    } catch {
      // ignore
    }

    // Check localStorage mock/cached profile
    try {
      const cached = localStorage.getItem(`mock_profile_${decodedParam}`);
      if (cached) {
        const parsed = JSON.parse(cached) as { faculty?: string; department?: string; university?: string };
        if (parsed.faculty) faculty = parsed.faculty;
        if (parsed.department) department = parsed.department;
        if (parsed.university) university = parsed.university;
      }
    } catch {
      // ignore
    }

    // Check local friendship override
    const localFriendState = localStorage.getItem(`friend_status_${targetUserId || decodedParam}`);
    if (localFriendState === 'friends' || localFriendState === 'pending_sent') {
      relationshipStatus = localFriendState;
    }
  }

  // Load posts by this author
  let authorPosts: Post[] = [];
  try {
    const res = await postsApi.listPublished({ limit: 50 });
    authorPosts = res.data.items.filter((p) => {
      const authorObj = p.author as unknown as Record<string, unknown> | undefined;
      const authorId = typeof authorObj?._id === 'string' ? authorObj._id : '';
      const authorDisplayName = authorName(p.author, '');

      if (isSelf && currentUser) {
        return (
          (authorId && authorId === currentUser._id) ||
          (authorDisplayName && authorDisplayName.toLowerCase() === currentUser.name.toLowerCase()) ||
          authorDisplayName === 'คุณ'
        );
      }

      return (
        (authorId && authorId === decodedParam) ||
        (authorDisplayName && authorDisplayName.toLowerCase() === userName.toLowerCase()) ||
        (authorDisplayName && authorDisplayName.toLowerCase().includes(decodedParam.toLowerCase()))
      );
    });
  } catch {
    // ignore
  }

  const container = el('div', { className: 'profile-page-shell' });

  // Back button
  const backBtn = el('a', {
    attrs: {
      href: '/',
      style:
        'display:inline-flex; align-items:center; gap:8px; margin-bottom:16px; font-size:0.9rem; font-weight:600; color:#554c44; text-decoration:none; padding:6px 12px; background:#ffffff; border:1px solid #e2ddd5; border-radius:8px;',
    },
    text: '← กลับสู่หน้าหลัก (ฟีดข่าว)',
  });

  // Profile Header Card
  const profileCard = el('div', { className: 'profile-header-card' });

  // Banner
  const banner = el('div', { className: 'profile-banner' });

  // Profile Content
  const contentRow = el('div', { className: 'profile-content-row' });

  const avatar = el('div', {
    className: 'profile-large-avatar',
    text: userName.charAt(0).toUpperCase(),
  });

  const mainInfo = el('div', { className: 'profile-main-info' });

  const nameTitleLine = el('div', { attrs: { style: 'display:flex; align-items:center; gap:10px; flex-wrap:wrap;' } });
  const nameHeading = el('h1', { className: 'profile-name-heading', text: userName });

  let badgeClass = 'badge-tag--tech-uni';
  if (university.includes('KMITL') || university.includes('ลาดกระบัง')) badgeClass = 'badge-tag--kmitl';
  else if (university.includes('KMUTT') || university.includes('บางมด')) badgeClass = 'badge-tag--kmutt';
  else if (university.includes('KMUTNB') || university.includes('พระนครเหนือ')) badgeClass = 'badge-tag--kmutnb';

  const uniBadge = el('span', { className: `badge-tag ${badgeClass}`, text: university });
  nameTitleLine.append(nameHeading, uniBadge);

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

  mainInfo.append(nameTitleLine, academicLine, bio);

  // Actions Slot (Right side of profile header)
  const actionsSlot = el('div', { className: 'profile-action-slot' });

  if (isSelf) {
    const selfBadge = el('div', {
      attrs: {
        style:
          'padding:8px 16px; background:#f5f0ea; color:#554c44; border-radius:20px; font-size:0.85rem; font-weight:700;',
      },
      text: '👤 โปรไฟล์ของคุณ',
    });
    actionsSlot.append(selfBadge);
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

    friendBtn.addEventListener('click', async () => {
      if (relationshipStatus === 'none') {
        friendBtn.disabled = true;
        friendBtn.textContent = 'กำลังส่ง...';
        try {
          if (targetUserId) {
            await sendFriendRequest(targetUserId);
          }
          localStorage.setItem(`friend_status_${targetUserId || decodedParam}`, 'pending_sent');
          relationshipStatus = 'pending_sent';
          friendBtn.textContent = 'ส่งคำขอแล้ว';
          friendBtn.className = 'profile-friend-btn profile-friend-btn--pending';
          toast.success(`ส่งคำขอเป็นเพื่อนไปยัง ${userName} เรียบร้อยแล้ว`);
        } catch {
          // Fallback optimistic
          localStorage.setItem(`friend_status_${targetUserId || decodedParam}`, 'pending_sent');
          relationshipStatus = 'pending_sent';
          friendBtn.textContent = 'ส่งคำขอแล้ว';
          friendBtn.className = 'profile-friend-btn profile-friend-btn--pending';
          toast.success(`ส่งคำขอเป็นเพื่อนเรียบร้อยแล้ว`);
        }
      }
    });

    actionsSlot.append(friendBtn);
  }

  contentRow.append(avatar, mainInfo, actionsSlot);
  profileCard.append(banner, contentRow);

  // Posts Feed Section
  const postsSection = el('div', { className: 'profile-posts-section' });
  const postsHeader = el('h2', {
    attrs: { style: 'font-size:1.15rem; font-weight:800; color:#231f20; margin: 24px 0 16px 0;' },
    text: `โพสต์และผลงานโดย ${userName} (${authorPosts.length})`,
  });
  postsSection.append(postsHeader);

  if (authorPosts.length > 0) {
    authorPosts.forEach((post) => {
      postsSection.append(postCard(post));
    });
  } else {
    const emptyNotice = el('div', {
      attrs: {
        style:
          'text-align:center; padding:48px 24px; background:#ffffff; border-radius:16px; border:1px dashed #e2ddd5; color:#8c827a;',
      },
      text: `${userName} ยังไม่มีโพสต์ที่เผยแพร่ในขณะนี้`,
    });
    postsSection.append(emptyNotice);
  }

  container.append(backBtn, profileCard, postsSection);

  return {
    title: `โปรไฟล์ - ${userName}`,
    element: container,
  };
}

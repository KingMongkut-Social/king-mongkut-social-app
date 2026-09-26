import { authStore } from '../../core/auth/auth-store';
import { notificationStore } from '../../core/notifications/notification-store';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { authorName, formatDate, formatRelativeTime } from '../../core/utils/format';
import { paginationWindow } from '../../core/utils/pagination';
import type { Post } from '../../types/api';
import { sendFriendRequest } from '../friends/friends-api';
import { openProfilePreviewModal } from '../profile/profile-modal';
import {
  createMentionPopover,
  FEELING_OPTIONS,
  type FeelingItem,
  type StudentTagItem,
} from './mention-tag';
import { postsApi } from './posts-api';

const postIcons = {
  like: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`,
  comment: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  share: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  photo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  tag: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  feeling: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
};

async function compressImageFile(file: File, maxDim = 2048, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function getPostImages(post: Post, isSample?: boolean): string[] {
  let imagesList: string[] = [];
  try {
    const localPostImages = JSON.parse(localStorage.getItem('local_post_images') || '{}') as Record<string, unknown>;
    const saved = localPostImages[post._id] ?? localStorage.getItem(`post_cover_${post._id}`);
    if (Array.isArray(saved)) {
      imagesList = saved.map(String).filter(Boolean);
    } else if (typeof saved === 'string' && saved) {
      try {
        const parsed = JSON.parse(saved) as unknown;
        if (Array.isArray(parsed)) imagesList = parsed.map(String).filter(Boolean);
        else imagesList = [saved];
      } catch {
        imagesList = [saved];
      }
    }
  } catch {
    // ignore
  }

  if (imagesList.length === 0 && post.coverImage) {
    imagesList = [post.coverImage];
  } else if (imagesList.length === 0 && isSample) {
    imagesList = ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80'];
  }
  return imagesList;
}

export function renderPostImagesGrid(imagesList: string[], postTitle = 'รูปภาพประกอบโปรเจกต์'): HTMLElement | null {
  if (imagesList.length === 0) return null;

  if (imagesList.length === 1 && imagesList[0]) {
    const singleWrap = el('div', { className: 'post-images-grid post-images-grid--single' });
    const img = el('img', {
      attrs: {
        src: imagesList[0],
        alt: postTitle,
        loading: 'lazy',
      },
    });
    img.addEventListener('click', () => {
      openLightbox(imagesList, 0);
    });
    singleWrap.append(img);
    return singleWrap;
  }

  const count = imagesList.length;
  let gridClass = 'post-images-grid--quad';
  if (count === 2) gridClass = 'post-images-grid--double';
  else if (count === 3) gridClass = 'post-images-grid--triple';

  const grid = el('div', { className: `post-images-grid ${gridClass}` });
  const maxVisible = 4;
  const visibleCount = Math.min(count, maxVisible);

  for (let i = 0; i < visibleCount; i++) {
    const cell = el('div', { className: 'post-grid-item' });
    const currentSrc = imagesList[i] || '';
    const img = el('img', {
      attrs: {
        src: currentSrc,
        alt: `รูปภาพที่ ${i + 1}`,
        loading: 'lazy',
      },
    });
    cell.append(img);

    if (i === maxVisible - 1 && count > maxVisible) {
      const moreOverlay = el('div', {
        className: 'post-grid-more-overlay',
        text: `+${count - maxVisible + 1}`,
      });
      cell.append(moreOverlay);
    }

    const imgIndex = i;
    cell.addEventListener('click', () => {
      openLightbox(imagesList, imgIndex);
    });

    grid.append(cell);
  }
  return grid;
}

export function postCard(
  post: Post,
  options: {
    mine?: boolean;
    isSample?: boolean;
    friendshipStatus?: 'none' | 'pending_sent' | 'friends';
  } = {}
): HTMLElement {
  const card = el('article', {
    className: 'feed-post-card',
    attrs: {
      id: `post-${post._id}`,
      'data-post-id': post._id,
    },
  });

  // 1. Post Header
  const header = el('div', { className: 'post-header' });
  const authorInfo = el('div', { className: 'post-author-info' });

  const authorData = post.user || post.author;
  const authorDisplayName = authorName(authorData);
  const authorObj = typeof authorData === 'object' && authorData ? (authorData as unknown as Record<string, unknown>) : null;
  const authorId = typeof authorObj?._id === 'string' ? authorObj._id : '';

  const currentUser = authStore.snapshot.user;
  const isMine = Boolean(
    options.mine ||
    (currentUser && (
      (authorId && currentUser._id === authorId) ||
      authorDisplayName === currentUser.name ||
      authorDisplayName === 'คุณ' ||
      (currentUser.name && authorDisplayName.toLowerCase() === currentUser.name.toLowerCase())
    ))
  );

  let finalAuthorName = authorDisplayName;
  let avatarLetter = 'ส';

  if (isMine && currentUser) {
    finalAuthorName = currentUser.name || authorDisplayName;
    avatarLetter = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'ส';
  } else if (authorDisplayName) {
    avatarLetter = authorDisplayName.charAt(0).toUpperCase();
  }

  // Extra Author Info (Faculty, Department)
  let authorDept = '';
  let authorFaculty = '';

  // 1. Check local post meta
  try {
    const postMetaRaw = localStorage.getItem(`post_meta_${post._id}`);
    if (postMetaRaw) {
      const postMeta = JSON.parse(postMetaRaw) as { department?: string; faculty?: string; authorInitial?: string; authorName?: string };
      if (postMeta.department) authorDept = postMeta.department;
      if (postMeta.faculty) authorFaculty = postMeta.faculty;
      if (postMeta.authorInitial) avatarLetter = postMeta.authorInitial;
      if (postMeta.authorName) finalAuthorName = postMeta.authorName;
    }
  } catch {
    // ignore
  }

  // 2. Check author mock profile
  if (authorId && (!authorDept || !authorFaculty)) {
    try {
      const stored = localStorage.getItem(`mock_profile_${authorId}`);
      if (stored) {
        const extra = JSON.parse(stored) as { department?: string; faculty?: string };
        if (extra.department && !authorDept) authorDept = extra.department;
        if (extra.faculty && !authorFaculty) authorFaculty = extra.faculty;
      }
    } catch {
      // ignore
    }
  }

  // 3. Check current user session
  if (isMine && currentUser) {
    if (!authorDept && currentUser.department) authorDept = currentUser.department;
    if (!authorFaculty && currentUser.faculty) authorFaculty = currentUser.faculty;
  }

  // 4. Check authorData direct fields
  if (!authorDept && typeof authorObj?.department === 'string') authorDept = authorObj.department;
  if (!authorFaculty && typeof authorObj?.faculty === 'string') authorFaculty = authorObj.faculty;

  // 5. Default fallback if sample Sarah Jenkins or general post
  if (options.isSample || finalAuthorName.includes('Sarah')) {
    if (!authorDept) authorDept = 'ภาควิชาวิศวกรรมคอมพิวเตอร์';
    if (!authorFaculty) authorFaculty = 'คณะวิศวกรรมศาสตร์';
  } else if (!authorDept) {
    authorDept = 'ภาควิชาวิศวกรรมคอมพิวเตอร์';
    if (!authorFaculty) authorFaculty = 'คณะวิศวกรรมศาสตร์';
  }

  // University Badge
  const authorUni = authorObj && typeof authorObj.university === 'string' ? authorObj.university : undefined;
  const uniTag = authorUni || (post.tags && post.tags[0]) || 'TECH UNIVERSITY';
  let badgeClass = 'badge-tag--tech-uni';
  if (uniTag.includes('KMITL') || uniTag.includes('สจล')) badgeClass = 'badge-tag--kmitl';
  else if (uniTag.includes('KMUTT') || uniTag.includes('มจธ')) badgeClass = 'badge-tag--kmutt';
  else if (uniTag.includes('KMUTNB') || uniTag.includes('มจพ')) badgeClass = 'badge-tag--kmutnb';

  const badge = el('span', {
    className: `badge-tag ${badgeClass}`,
    text: uniTag,
  });

  let syncFriendButtonStatus: ((newStatus: 'none' | 'pending_sent' | 'friends') => void) | null = null;

  const openProfilePreview = () => {
    openProfilePreviewModal({
      authorId,
      name: finalAuthorName,
      avatarLetter,
      university: authorUni || uniTag,
      faculty: authorFaculty,
      department: authorDept,
      isMine,
      onFriendStatusChange: (newStatus) => {
        if (syncFriendButtonStatus) {
          syncFriendButtonStatus(newStatus);
        }
      },
    });
  };

  const avatar = el('div', {
    className: 'post-avatar',
    attrs: { title: `ดูโปรไฟล์ของ ${finalAuthorName}`, style: 'cursor: pointer;' },
    text: avatarLetter,
  });
  avatar.addEventListener('click', (e) => {
    e.stopPropagation();
    openProfilePreview();
  });

  const details = el('div', { className: 'post-author-details' });
  const nameLine = el('div', { className: 'post-author-name-line' });
  const author = el('span', {
    className: 'post-author-name',
    attrs: { title: `ดูโปรไฟล์ของ ${finalAuthorName}`, style: 'cursor: pointer;' },
    text: finalAuthorName,
  });
  author.addEventListener('click', (e) => {
    e.stopPropagation();
    openProfilePreview();
  });

  let postMeta: {
    feeling?: { emoji: string; label: string };
    taggedFriends?: Array<{ id: string; name: string; studentId: string; university: string }>;
  } | null = null;
  try {
    const rawMeta = localStorage.getItem(`post_meta_${post._id}`);
    if (rawMeta) {
      postMeta = JSON.parse(rawMeta);
    }
  } catch {
    // ignore
  }

  nameLine.append(author);
  if (postMeta?.feeling) {
    const feelingSpan = el('span', {
      className: 'post-feeling-text',
      text: `— รู้สึก ${postMeta.feeling.emoji} ${postMeta.feeling.label}`,
    });
    nameLine.append(feelingSpan);
  }
  nameLine.append(badge);

  // Department & Major Line (ภาควิชา • คณะวิชา)
  const deptLine = el('div', { className: 'post-dept-line' });
  const deptSpan = el('span', { text: authorDept });
  deptLine.append(deptSpan);
  if (authorFaculty && authorFaculty !== authorDept) {
    const dot = el('span', { className: 'post-dot-sep', text: '•' });
    const facSpan = el('span', { text: authorFaculty });
    deptLine.append(dot, facSpan);
  }

  // Check if edited
  const isEdited = Boolean(
    (post.updatedAt && post.createdAt && new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > 2000) ||
    localStorage.getItem(`post_edit_history_${post._id}`)
  );

  // Timestamp Line (เวลาที่โพสต์)
  const timestamp = el('div', { className: 'post-timestamp' });
  const timeSpan = el('span', {
    attrs: { title: formatDate(post.createdAt) },
    text: formatRelativeTime(post.createdAt),
  });
  timestamp.append(timeSpan);

  let editedTag: HTMLElement | null = null;
  const renderEditedTag = () => {
    const tag = el('button', {
      className: 'post-edited-tag',
      attrs: { type: 'button', title: 'คลิกเพื่อดูประวัติการแก้ไข' },
      text: '• มีการแก้ไข',
    });
    tag.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditHistoryModal(post, finalAuthorName);
    });
    return tag;
  };

  if (isEdited) {
    editedTag = renderEditedTag();
    timestamp.append(editedTag);
  }

  details.append(nameLine, deptLine, timestamp);
  authorInfo.append(avatar, details);

  // Right Side of Post Header: Owner 3-dots Dropdown vs Non-Owner Friend Button
  if (isMine) {
    const menuWrap = el('div', { className: 'post-menu-wrap' });
    const menuBtn = el('button', {
      className: 'post-menu-btn',
      attrs: { type: 'button', 'aria-label': 'ตัวเลือกจัดการโพสต์' },
      text: '•••',
    });

    const dropdown = el('div', {
      className: 'post-actions-dropdown',
      attrs: { style: 'display: none;' },
    });

    const editItem = el('button', {
      className: 'post-dropdown-item',
      attrs: { type: 'button' },
    });
    editItem.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> แก้ไขโพสต์`;

    const historyItem = el('button', {
      className: 'post-dropdown-item',
      attrs: { type: 'button' },
    });
    historyItem.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ดูการแก้ไขโพสต์`;

    const deleteItem = el('button', {
      className: 'post-dropdown-item post-dropdown-item--danger',
      attrs: { type: 'button' },
    });
    deleteItem.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> ลบ`;

    const updateDropdownItems = () => {
      dropdown.innerHTML = '';
      dropdown.append(editItem);
      const hasHistory = Boolean(
        (post.updatedAt && post.createdAt && new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > 2000) ||
        localStorage.getItem(`post_edit_history_${post._id}`)
      );
      if (hasHistory) {
        dropdown.append(historyItem);
      }
      dropdown.append(deleteItem);
    };

    updateDropdownItems();

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = dropdown.style.display === 'none';
      document.querySelectorAll('.post-actions-dropdown').forEach((d) => {
        (d as HTMLElement).style.display = 'none';
      });
      dropdown.style.display = isHidden ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
      if (!menuWrap.contains(e.target as Node)) {
        dropdown.style.display = 'none';
      }
    });

    historyItem.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = 'none';
      openEditHistoryModal(post, finalAuthorName);
    });

    editItem.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = 'none';
      openEditPostModal(post, card, () => {
        if (!editedTag) {
          editedTag = renderEditedTag();
          timeSpan.after(editedTag);
        }
        updateDropdownItems();
      });
    });

    deleteItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      dropdown.style.display = 'none';
      const confirmed = window.confirm('ต้องการลบโพสต์นี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้');
      if (!confirmed) return;

      try {
        await postsApi.remove(post._id);
        toast.success('ลบโพสต์เรียบร้อย');
        card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.96)';
        setTimeout(() => card.remove(), 250);
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });

    menuWrap.append(menuBtn, dropdown);
    header.append(authorInfo, menuWrap);
  } else {
    // Non-owner post: show friend action button on the top right
    const targetKey = authorId || finalAuthorName;
    const localStatus = localStorage.getItem(`friend_status_${targetKey}`);

    let currentFriendStatus: 'none' | 'pending_sent' | 'friends' =
      localStatus === 'friends' || localStatus === 'pending_sent'
        ? localStatus
        : options.friendshipStatus || 'none';

    const friendBtn = el('button', {
      className: `post-friend-btn ${
        currentFriendStatus === 'friends'
          ? 'post-friend-btn--friend'
          : currentFriendStatus === 'pending_sent'
          ? 'post-friend-btn--pending'
          : 'post-friend-btn--add'
      }`,
      attrs: {
        type: 'button',
        title:
          currentFriendStatus === 'friends'
            ? 'คุณเป็นเพื่อนกับบุคคลนี้แล้ว'
            : currentFriendStatus === 'pending_sent'
            ? 'ส่งคำขอเป็นเพื่อนแล้ว'
            : `เพิ่ม ${finalAuthorName} เป็นเพื่อน`,
      },
      text:
        currentFriendStatus === 'friends'
          ? 'เพื่อน'
          : currentFriendStatus === 'pending_sent'
          ? 'ส่งคำขอแล้ว'
          : '+ เพิ่มเพื่อน',
    });

    syncFriendButtonStatus = (newStatus) => {
      currentFriendStatus = newStatus;
      friendBtn.className = `post-friend-btn ${
        newStatus === 'friends'
          ? 'post-friend-btn--friend'
          : newStatus === 'pending_sent'
          ? 'post-friend-btn--pending'
          : 'post-friend-btn--add'
      }`;
      friendBtn.textContent =
        newStatus === 'friends'
          ? 'เพื่อน'
          : newStatus === 'pending_sent'
          ? 'ส่งคำขอแล้ว'
          : '+ เพิ่มเพื่อน';
    };

    if (currentFriendStatus === 'none') {
      friendBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        friendBtn.disabled = true;
        friendBtn.textContent = 'กำลังส่ง...';

        try {
          if (authorId) {
            await sendFriendRequest(authorId);
          }
          localStorage.setItem(`friend_status_${targetKey}`, 'pending_sent');
          currentFriendStatus = 'pending_sent';
          friendBtn.className = 'post-friend-btn post-friend-btn--pending';
          friendBtn.textContent = 'ส่งคำขอแล้ว';
          toast.success(`ส่งคำขอเป็นเพื่อนไปยัง ${finalAuthorName} เรียบร้อยแล้ว`);
        } catch {
          localStorage.setItem(`friend_status_${targetKey}`, 'pending_sent');
          currentFriendStatus = 'pending_sent';
          friendBtn.className = 'post-friend-btn post-friend-btn--pending';
          friendBtn.textContent = 'ส่งคำขอแล้ว';
          toast.success(`ส่งคำขอเป็นเพื่อนเรียบร้อยแล้ว`);
        }
      });
    }

    header.append(authorInfo, friendBtn);
  }

  card.append(header);

  // 2. Post Body Content
  if (post.content && post.content.trim() !== '[รูปภาพ]') {
    const bodyText = el('div', {
      className: 'post-body-text',
    });
    const parts = post.content.split(/(@[^\s@]+)/g);
    parts.forEach((part) => {
      if (part.startsWith('@') && part.length > 1) {
        const mentionClean = part.slice(1);
        const tagSpan = el('span', {
          className: 'post-mention-tag',
          attrs: { title: `ดูโปรไฟล์ของ ${mentionClean}` },
          text: part,
        });
        tagSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          openProfilePreviewModal({
            name: mentionClean,
          });
        });
        bodyText.append(tagSpan);
      } else if (part) {
        bodyText.append(document.createTextNode(part));
      }
    });
    card.append(bodyText);
  }

  // 3. Post Media Images (supports 1 image natural ratio or multi-image grid with lightbox zoom)
  const imagesList = getPostImages(post, options.isSample);
  const mediaGrid = renderPostImagesGrid(imagesList, post.title);
  if (mediaGrid) {
    card.append(mediaGrid);
  }

  // --- 4. Likes & Comments State from localStorage ---
  interface PostLikeUser {
    id?: string | undefined;
    name: string;
  }

  interface PostCommentReply {
    id: string;
    authorId?: string | undefined;
    authorName: string;
    university?: string | undefined;
    department?: string | undefined;
    content: string;
    createdAt: string;
  }

  interface PostComment {
    id: string;
    authorId?: string | undefined;
    authorName: string;
    university?: string | undefined;
    department?: string | undefined;
    content: string;
    createdAt: string;
    replies?: PostCommentReply[] | undefined;
  }

  // Load likes
  let likesList: PostLikeUser[] = options.isSample
    ? [
        { id: 'sample_u1', name: 'David Chen (KMUTT)' },
        { id: 'sample_u2', name: 'Emily Rodriguez (KMUTNB)' },
        { id: 'sample_u3', name: 'ภานุวัฒน์ (สจล.)' },
      ]
    : [];

  try {
    const storedLikes = localStorage.getItem(`post_likes_${post._id}`);
    if (storedLikes) {
      const parsed: unknown = JSON.parse(storedLikes);
      if (Array.isArray(parsed)) {
        likesList = parsed
          .map((item: unknown): PostLikeUser | null => {
            if (typeof item === 'string') return { name: item };
            if (item && typeof item === 'object' && 'name' in item && typeof item.name === 'string') {
              const obj = item as { id?: unknown };
              return {
                id: typeof obj.id === 'string' ? obj.id : undefined,
                name: item.name,
              };
            }
            return null;
          })
          .filter((item): item is PostLikeUser => item !== null);
      } else if (parsed && typeof parsed === 'object' && 'users' in parsed && Array.isArray(parsed.users)) {
        // Migration from old { users: string[], userLiked: boolean } format
        const oldUsers = parsed.users as unknown[];
        likesList = oldUsers
          .filter((name): name is string => typeof name === 'string')
          .map((name) => ({ name }));
      }
    }
  } catch {
    // ignore
  }

  const checkIfCurrentUserLiked = (): boolean => {
    const user = authStore.snapshot.user;
    if (!user) return false;
    return likesList.some(
      (u) => (Boolean(u.id) && Boolean(user._id) && u.id === user._id) || (Boolean(u.name) && Boolean(user.name) && u.name === user.name)
    );
  };

  // Load comments
  let commentsList: PostComment[] = options.isSample
    ? [
        {
          id: 'c1',
          authorName: 'David Chen',
          university: 'KMUTT',
          department: 'วิศวกรรมคอมพิวเตอร์',
          content: 'สุดยอดมากครับ เซ็นเซอร์ตัวนี้ตอบสนองไวกว่ารุ่นก่อนหน้าเยอะเลย 👍',
          createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        },
        {
          id: 'c2',
          authorName: 'Emily Rodriguez',
          university: 'KMUTNB',
          department: 'วิทยาการข้อมูล',
          content: 'รอติดตามผลการทดสอบ Thermal testing นะคะ มีแพลนเปิดโอเพนซอร์สไหมคะ?',
          createdAt: new Date(Date.now() - 1800 * 1000).toISOString(),
        },
      ]
    : [];

  try {
    const storedComments = localStorage.getItem(`post_comments_${post._id}`);
    if (storedComments) {
      commentsList = JSON.parse(storedComments) as PostComment[];
    }
  } catch {
    // ignore
  }

  const persistLikes = () => {
    try {
      localStorage.setItem(`post_likes_${post._id}`, JSON.stringify(likesList));
    } catch {
      // ignore
    }
  };

  const persistComments = () => {
    try {
      localStorage.setItem(`post_comments_${post._id}`, JSON.stringify(commentsList));
    } catch {
      // ignore
    }
  };

  // Likers summary line ("ขึ้นชื่อคนกดด้วย")
  const likersLine = el('div', { className: 'post-likers-line', attrs: { style: 'display: none;' } });
  const updateLikersUI = () => {
    const total = likesList.length;
    if (total === 0) {
      likersLine.style.display = 'none';
      likersLine.innerHTML = '';
      return;
    }

    likersLine.style.display = 'flex';
    likersLine.innerHTML = '';
    const heartIcon = el('span', { className: 'post-likers-icon', text: '❤️' });

    const currentUser = authStore.snapshot.user;
    const isLiked = checkIfCurrentUserLiked();

    let summaryText = '';
    if (isLiked) {
      if (total === 1) {
        summaryText = 'คุณ ถูกใจสิ่งนี้';
      } else if (total === 2) {
        const other = likesList.find((u) => u.name !== currentUser?.name && u.id !== currentUser?._id)?.name || likesList[1]?.name || 'เพื่อน';
        summaryText = `คุณ และ ${other} ถูกใจสิ่งนี้`;
      } else {
        const other = likesList.find((u) => u.name !== currentUser?.name && u.id !== currentUser?._id)?.name || likesList[1]?.name || 'เพื่อน';
        summaryText = `คุณ, ${other} และอีก ${total - 2} คน ถูกใจสิ่งนี้`;
      }
    } else {
      const first = likesList[0]?.name || 'ผู้ใช้';
      const second = likesList[1]?.name || 'ผู้ใช้';
      if (total === 1) {
        summaryText = `${first} ถูกใจสิ่งนี้`;
      } else if (total === 2) {
        summaryText = `${first} และ ${second} ถูกใจสิ่งนี้`;
      } else {
        summaryText = `${first}, ${second} และอีก ${total - 2} คน ถูกใจสิ่งนี้`;
      }
    }

    const textSpan = el('span', { className: 'post-likers-names', text: summaryText });
    likersLine.append(heartIcon, textSpan);
    likersLine.title = `รายชื่อคนกดถูกใจ: ${likesList.map((u) => u.name).join(', ')}`;
  };

  // 5. Reactions Footer
  const footer = el('div', { className: 'post-reactions-footer' });
  const leftGroup = el('div', { className: 'post-reaction-group' });

  const likeBtn = el('button', { className: 'reaction-btn', attrs: { type: 'button' } });
  const updateLikeBtnUI = () => {
    const count = likesList.length;
    const isLiked = checkIfCurrentUserLiked();
    if (isLiked) {
      likeBtn.className = 'reaction-btn reaction-btn--liked';
    } else {
      likeBtn.className = 'reaction-btn';
    }
    likeBtn.innerHTML = `${postIcons.like} <span>${count}</span>`;
  };

  updateLikeBtnUI();
  updateLikersUI();

  likeBtn.addEventListener('click', () => {
    const currentUser = authStore.snapshot.user;
    if (!currentUser) {
      toast.info('กรุณาเข้าสู่ระบบก่อนกดถูกใจ');
      return;
    }

    const isLiked = checkIfCurrentUserLiked();
    if (isLiked) {
      likesList = likesList.filter(
        (u) => !(u.id && currentUser._id && u.id === currentUser._id) && u.name !== currentUser.name
      );
    } else {
      likesList = [
        { id: currentUser._id, name: currentUser.name || 'คุณ' },
        ...likesList.filter(
          (u) => !(u.id && currentUser._id && u.id === currentUser._id) && u.name !== currentUser.name
        ),
      ];

      // Trigger notification for post author
      if (authorId && authorId !== currentUser._id) {
        notificationStore.addNotification({
          recipientId: authorId,
          recipientName: finalAuthorName,
          actorName: currentUser.name || 'คุณ',
          actorInitial: currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'ส',
          type: 'like',
          postId: post._id,
          postSnippet: post.title || post.content.slice(0, 40),
        });
      }
    }
    persistLikes();
    updateLikeBtnUI();
    updateLikersUI();
  });

  const commentBtn = el('button', { className: 'reaction-btn', attrs: { type: 'button' } });
  const updateCommentBtnUI = () => {
    let total = commentsList.length;
    commentsList.forEach((c) => {
      if (c.replies) total += c.replies.length;
    });
    commentBtn.innerHTML = `${postIcons.comment} <span>${total}</span>`;
  };
  updateCommentBtnUI();

  leftGroup.append(likeBtn, commentBtn);

  const shareBtn = el('button', { className: 'reaction-btn', attrs: { type: 'button' } });
  shareBtn.innerHTML = `${postIcons.share} <span>แชร์</span>`;
  shareBtn.addEventListener('click', () => {
    try {
      void navigator.clipboard.writeText(window.location.origin + `/#post-${post._id}`);
      toast.success('คัดลอกลิงก์โพสต์เรียบร้อยแล้ว');
    } catch {
      toast.info('แชร์โพสต์เรียบร้อยแล้ว');
    }
  });

  footer.append(leftGroup, shareBtn);

  // 6. Comments Section Dropdown
  const commentsSection = el('div', {
    className: 'post-comments-section',
    attrs: { style: 'display: none;' },
  });

  const commentsListWrap = el('div', { className: 'comments-list' });

  const renderComments = () => {
    commentsListWrap.innerHTML = '';
    if (commentsList.length === 0) {
      const emptyMsg = el('p', {
        attrs: { style: 'font-size: 0.82rem; color: #94a3b8; text-align: center; margin: 4px 0;' },
        text: 'ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็นเลย!',
      });
      commentsListWrap.append(emptyMsg);
      return;
    }

    commentsList.forEach((c) => {
      const threadBlock = el('div', { className: 'comment-thread-block' });
      const item = el('div', { className: 'comment-item' });
      const cLetter = c.authorName ? c.authorName.charAt(0).toUpperCase() : 'ส';
      const avatarWrap = el('div', {
        className: 'comment-avatar',
        attrs: { title: c.authorName },
        text: cLetter,
      });

      const bubble = el('div', { className: 'comment-bubble' });
      const cHeader = el('div', { className: 'comment-header' });
      const nameEl = el('span', { className: 'comment-author-name', text: c.authorName });
      cHeader.append(nameEl);

      if (c.university) {
        const uBadge = el('span', { className: 'badge-tag badge-tag--tech-uni', text: c.university });
        cHeader.append(uBadge);
      }
      if (c.department) {
        const deptTag = el('span', { className: 'comment-dept-tag', text: c.department });
        cHeader.append(deptTag);
      }

      const textEl = el('div', { className: 'comment-text', text: c.content });

      const footerActions = el('div', { className: 'comment-footer-actions' });
      const timeEl = el('span', { className: 'comment-footer', text: formatRelativeTime(c.createdAt) });
      const replyBtn = el('button', {
        className: 'btn-reply-comment',
        attrs: { type: 'button' },
        text: 'ตอบกลับ',
      });
      footerActions.append(timeEl, replyBtn);

      bubble.append(cHeader, textEl, footerActions);
      item.append(avatarWrap, bubble);
      threadBlock.append(item);

      // Render replies if any
      if (c.replies && c.replies.length > 0) {
        const repliesListEl = el('div', { className: 'comment-replies-list' });
        c.replies.forEach((r) => {
          const rItem = el('div', { className: 'comment-reply-item' });
          const rLetter = r.authorName ? r.authorName.charAt(0).toUpperCase() : 'ส';
          const rAvatar = el('div', {
            className: 'comment-avatar',
            attrs: { title: r.authorName },
            text: rLetter,
          });

          const rBubble = el('div', { className: 'comment-bubble' });
          const rHeader = el('div', { className: 'comment-header' });
          const rName = el('span', { className: 'comment-author-name', text: r.authorName });
          rHeader.append(rName);
          if (r.university) {
            rHeader.append(el('span', { className: 'badge-tag badge-tag--tech-uni', text: r.university }));
          }
          if (r.department) {
            rHeader.append(el('span', { className: 'comment-dept-tag', text: r.department }));
          }

          const rText = el('div', { className: 'comment-text', text: r.content });
          const rTime = el('div', { className: 'comment-footer', text: formatRelativeTime(r.createdAt) });
          rBubble.append(rHeader, rText, rTime);

          rItem.append(rAvatar, rBubble);
          repliesListEl.append(rItem);
        });
        threadBlock.append(repliesListEl);
      }

      // Inline Reply Form (hidden by default)
      const replyForm = el('form', {
        className: 'comment-reply-form',
        attrs: { style: 'display: none;', novalidate: 'true' },
      });
      const rMyLetter = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'ส';
      const rMyAvatar = el('div', {
        className: 'comment-avatar',
        attrs: { title: currentUser?.name || 'โปรไฟล์ของคุณ' },
        text: rMyLetter,
      });
      const rInputWrap = el('div', { className: 'comment-input-wrap' });
      const rInput = el('input', {
        className: 'comment-input-field',
        attrs: {
          type: 'text',
          placeholder: `ตอบกลับ ${c.authorName}…`,
          autocomplete: 'off',
        },
      });
      const rSendBtn = el('button', {
        className: 'btn-send-comment',
        attrs: { type: 'submit' },
        text: 'ตอบ',
      });
      const rCancelBtn = el('button', {
        className: 'btn-cancel-reply',
        attrs: { type: 'button' },
        text: 'ยกเลิก',
      });
      rInputWrap.append(rInput, rSendBtn);
      replyForm.append(rMyAvatar, rInputWrap, rCancelBtn);

      replyBtn.addEventListener('click', () => {
        const isHidden = replyForm.style.display === 'none';
        replyForm.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
          rInput.value = `@${c.authorName} `;
          rInput.focus();
        }
      });

      rCancelBtn.addEventListener('click', () => {
        replyForm.style.display = 'none';
        rInput.value = '';
      });

      replyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const replyContent = rInput.value.trim();
        if (!replyContent) return;

        const user = authStore.snapshot.user;
        const newReply: PostCommentReply = {
          id: `r_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          authorId: user?._id,
          authorName: user?.name || 'คุณ',
          university: user?.university || 'KMITL',
          department: user?.department || 'ภาควิชาวิศวกรรมคอมพิวเตอร์',
          content: replyContent,
          createdAt: new Date().toISOString(),
        };

        if (!c.replies) c.replies = [];
        c.replies.push(newReply);
        persistComments();
        renderComments();
        updateCommentBtnUI();
        toast.success('ตอบกลับความคิดเห็นเรียบร้อยแล้ว');

        // Trigger Notification for comment author
        if (c.authorId || authorId) {
          notificationStore.addNotification({
            recipientId: c.authorId || authorId,
            recipientName: c.authorName,
            actorName: user?.name || 'คุณ',
            actorInitial: user?.name ? user.name.charAt(0).toUpperCase() : 'ส',
            type: 'reply',
            postId: post._id,
            postSnippet: post.title || post.content.slice(0, 40),
            contentSnippet: replyContent,
          });
        }
      });

      threadBlock.append(replyForm);
      commentsListWrap.append(threadBlock);
    });
  };

  renderComments();

  // Comment Input Form
  const inputForm = el('form', { className: 'comment-input-form', attrs: { novalidate: 'true' } });
  const myLetter = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'ส';
  const currentUserAvatar = el('div', {
    className: 'comment-avatar',
    attrs: { title: currentUser?.name || 'โปรไฟล์ของคุณ' },
    text: myLetter,
  });

  const inputWrap = el('div', { className: 'comment-input-wrap' });
  const commentInput = el('input', {
    className: 'comment-input-field',
    attrs: {
      type: 'text',
      placeholder: 'เขียนความคิดเห็น…',
      autocomplete: 'off',
    },
  });
  const sendBtn = el('button', {
    className: 'btn-send-comment',
    attrs: { type: 'submit' },
    text: 'ส่ง',
  });

  inputWrap.append(commentInput, sendBtn);
  inputForm.append(currentUserAvatar, inputWrap);

  inputForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = commentInput.value.trim();
    if (!content) return;

    const user = authStore.snapshot.user;
    const newComment: PostComment = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: user?._id,
      authorName: user?.name || 'คุณ (นักศึกษา)',
      university: user?.university || 'KMITL',
      department: user?.department || 'ภาควิชาวิศวกรรมคอมพิวเตอร์',
      content,
      createdAt: new Date().toISOString(),
      replies: [],
    };

    commentsList.push(newComment);
    persistComments();
    renderComments();
    updateCommentBtnUI();
    commentInput.value = '';
    toast.success('แสดงความคิดเห็นเรียบร้อยแล้ว');

    // Trigger Notification for post author
    if (authorId && authorId !== user?._id) {
      notificationStore.addNotification({
        recipientId: authorId,
        recipientName: finalAuthorName,
        actorName: user?.name || 'คุณ',
        actorInitial: user?.name ? user.name.charAt(0).toUpperCase() : 'ส',
        type: 'comment',
        postId: post._id,
        postSnippet: post.title || post.content.slice(0, 40),
        contentSnippet: content,
      });
    }
  });

  commentsSection.append(commentsListWrap, inputForm);

  // Toggle comments dropdown
  commentBtn.addEventListener('click', () => {
    const isClosed = commentsSection.style.display === 'none';
    commentsSection.style.display = isClosed ? 'flex' : 'none';
    if (isClosed) {
      commentBtn.classList.add('reaction-btn--active-comment');
      setTimeout(() => commentInput.focus(), 50);
    } else {
      commentBtn.classList.remove('reaction-btn--active-comment');
    }
  });

  card.append(likersLine, footer, commentsSection);

  return card;
}

export function pagination(
  current: number,
  total: number,
  search: string,
  basePath: string,
): HTMLElement | null {
  if (total <= 1) return null;

  const nav = el('nav', { className: 'pagination', attrs: { 'aria-label': 'การแบ่งหน้า' } });
  const buildHref = (page: number): string => {
    const query = new URLSearchParams();
    query.set('page', String(page));
    if (search) query.set('search', search);
    return `${basePath}?${query.toString()}`;
  };

  if (current > 1) nav.append(el('a', { className: 'pagination__link', text: '← ก่อนหน้า', attrs: { href: buildHref(current - 1) } }));

  for (const page of paginationWindow(current, total)) {
    if (page === current) {
      nav.append(el('span', { className: 'pagination__link is-current', text: String(page), attrs: { 'aria-current': 'page' } }));
    } else {
      nav.append(el('a', { className: 'pagination__link', text: String(page), attrs: { href: buildHref(page) } }));
    }
  }

  if (current < total) nav.append(el('a', { className: 'pagination__link', text: 'ถัดไป →', attrs: { href: buildHref(current + 1) } }));
  return nav;
}

export function searchForm(value: string, action: string): HTMLFormElement {
  const form = el('form', { className: 'search', attrs: { method: 'get', action, role: 'search' } });
  const input = el('input', {
    className: 'input search__input',
    attrs: {
      type: 'search',
      name: 'search',
      value,
      placeholder: 'ค้นหาโพสต์…',
      maxlength: '100',
      'aria-label': 'ค้นหาโพสต์',
    },
  });
  form.append(input, el('button', { className: 'button button--secondary', text: 'ค้นหา', attrs: { type: 'submit' } }));
  return form;
}

export function openLightbox(images: string[], initialIndex = 0): void {
  if (!images || images.length === 0) return;
  let currentIndex = initialIndex;
  let scale = 1.0;
  const minScale = 0.5;
  const maxScale = 4.0;
  const step = 0.25;

  const overlay = el('div', { className: 'image-lightbox-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } });

  // Header controls
  const toolbar = el('div', { className: 'lightbox-toolbar' });
  const counter = el('div', { className: 'lightbox-counter', text: `${currentIndex + 1} / ${images.length}` });
  const actions = el('div', { className: 'lightbox-actions' });

  const zoomOutBtn = el('button', { className: 'lightbox-btn', attrs: { type: 'button', title: 'ซูมออก (-)' }, text: '−' });
  const zoomResetBtn = el('button', { className: 'lightbox-btn', attrs: { type: 'button', title: 'ขนาดจริง 100%' }, text: '1:1' });
  const zoomInBtn = el('button', { className: 'lightbox-btn', attrs: { type: 'button', title: 'ซูมเข้า (+)' }, text: '+' });
  const closeBtn = el('button', { className: 'lightbox-btn lightbox-btn--close', attrs: { type: 'button', title: 'ปิด (Esc)' }, text: '✕' });

  actions.append(zoomOutBtn, zoomResetBtn, zoomInBtn, closeBtn);
  toolbar.append(counter, actions);

  // Stage & Image
  const stage = el('div', { className: 'lightbox-stage' });
  const img = el('img', {
    className: 'lightbox-image',
    attrs: {
      src: images[currentIndex] || '',
      alt: 'รูปภาพขยายขนาดจริง',
    },
  });
  stage.append(img);

  // Prev / Next arrows
  const prevBtn = el('button', { className: 'lightbox-nav lightbox-nav--prev', attrs: { type: 'button', title: 'ก่อนหน้า' }, text: '‹' });
  const nextBtn = el('button', { className: 'lightbox-nav lightbox-nav--next', attrs: { type: 'button', title: 'ถัดไป' }, text: '›' });
  if (images.length > 1) {
    overlay.append(prevBtn, nextBtn);
  }

  const updateZoom = () => {
    img.style.transform = `scale(${scale})`;
    img.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
    zoomResetBtn.textContent = `${Math.round(scale * 100)}%`;
  };

  zoomInBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = Math.min(maxScale, Number((scale + step).toFixed(2)));
    updateZoom();
  });

  zoomOutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = Math.max(minScale, Number((scale - step).toFixed(2)));
    updateZoom();
  });

  zoomResetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = 1.0;
    updateZoom();
  });

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      scale = Math.min(maxScale, Number((scale + step).toFixed(2)));
    } else {
      scale = Math.max(minScale, Number((scale - step).toFixed(2)));
    }
    updateZoom();
  }, { passive: false });

  img.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = scale === 1.0 ? 2.0 : 1.0;
    updateZoom();
  });

  const updateSlide = (idx: number) => {
    currentIndex = (idx + images.length) % images.length;
    img.src = images[currentIndex] || '';
    scale = 1.0;
    updateZoom();
    counter.textContent = `${currentIndex + 1} / ${images.length}`;
  };

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    updateSlide(currentIndex - 1);
  });

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    updateSlide(currentIndex + 1);
  });

  const closeLightbox = () => {
    document.removeEventListener('keydown', onKeyDown);
    overlay.remove();
    document.body.style.overflow = '';
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') updateSlide(currentIndex - 1);
    else if (e.key === 'ArrowRight') updateSlide(currentIndex + 1);
    else if (e.key === '+' || e.key === '=') { scale = Math.min(maxScale, Number((scale + step).toFixed(2))); updateZoom(); }
    else if (e.key === '-') { scale = Math.max(minScale, Number((scale - step).toFixed(2))); updateZoom(); }
    else if (e.key === '0') { scale = 1.0; updateZoom(); }
  };

  closeBtn.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target === stage) closeLightbox();
  });
  document.addEventListener('keydown', onKeyDown);

  overlay.append(toolbar, stage);
  document.body.style.overflow = 'hidden';
  document.body.append(overlay);
}

export function openEditPostModal(
  post: Post,
  card: HTMLElement,
  onEdited?: (newContent: string) => void
): void {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'edit-post-modal' });

  const modalHeader = el('div', { className: 'edit-post-modal__header' });
  const modalTitle = el('h3', { className: 'edit-post-modal__title', text: 'แก้ไขโพสต์' });
  const closeBtn = el('button', {
    className: 'edit-post-modal__close-btn',
    attrs: { type: 'button', 'aria-label': 'ปิด' },
    text: '✕',
  });
  modalHeader.append(modalTitle, closeBtn);

  const modalBody = el('div', {
    className: 'edit-post-modal__body',
    attrs: { style: 'position: relative; padding: 18px 24px;' },
  });

  // Load existing meta (feelings and tagged friends)
  interface StoredPostMeta {
    authorName?: string;
    authorInitial?: string;
    department?: string;
    faculty?: string;
    feeling?: FeelingItem | null;
    taggedFriends?: StudentTagItem[];
  }
  let currentMeta: StoredPostMeta = {};
  try {
    const raw = localStorage.getItem(`post_meta_${post._id}`);
    if (raw) currentMeta = JSON.parse(raw);
  } catch {
    // ignore
  }

  let selectedFeeling: FeelingItem | null = currentMeta.feeling || null;
  let selectedTaggedFriends: StudentTagItem[] = Array.isArray(currentMeta.taggedFriends)
    ? [...currentMeta.taggedFriends]
    : [];

  // 1. Content Textarea
  const textarea = el('textarea', {
    className: 'edit-post-modal__textarea',
    attrs: { rows: '3', placeholder: 'คุณกำลังคิดอะไรอยู่?' },
  });
  const initialContent = (post.content || '').trim();
  textarea.value = initialContent === '[รูปภาพ]' ? '' : initialContent;

  // 2. Extras Bar (Selected feeling & tagged friends)
  const extrasBar = el('div', {
    className: 'create-post-extras-bar',
    attrs: { style: 'display: none; margin-top: 8px;' },
  });

  const renderExtrasBar = () => {
    extrasBar.innerHTML = '';
    if (!selectedFeeling && selectedTaggedFriends.length === 0) {
      extrasBar.style.display = 'none';
      return;
    }
    extrasBar.style.display = 'flex';

    if (selectedFeeling) {
      const feelingPill = el('div', { className: 'composer-extra-pill composer-extra-pill--feeling' });
      const iconText = el('span', { text: `รู้สึก ${selectedFeeling.emoji} ${selectedFeeling.label}` });
      const removeBtn = el('button', {
        className: 'composer-pill-remove',
        attrs: { type: 'button', title: 'ยกเลิกความรู้สึกนี้' },
        text: '✕',
      });
      removeBtn.addEventListener('click', () => {
        selectedFeeling = null;
        renderExtrasBar();
      });
      feelingPill.append(iconText, removeBtn);
      extrasBar.append(feelingPill);
    }

    selectedTaggedFriends.forEach((friend, idx) => {
      const tagPill = el('div', { className: 'composer-extra-pill composer-extra-pill--tag' });
      const friendText = el('span', { text: `แท็ก: @${friend.name} (${friend.studentId})` });
      const removeBtn = el('button', {
        className: 'composer-pill-remove',
        attrs: { type: 'button', title: 'ลบการแท็กนี้' },
        text: '✕',
      });
      removeBtn.addEventListener('click', () => {
        selectedTaggedFriends.splice(idx, 1);
        renderExtrasBar();
      });
      tagPill.append(friendText, removeBtn);
      extrasBar.append(tagPill);
    });
  };

  renderExtrasBar();

  // 3. Mention Autocomplete Popover
  const mentionPopover = createMentionPopover(modalBody);

  const handleMentionCheck = () => {
    const val = textarea.value;
    const cursorPos = textarea.selectionStart || 0;
    const textBefore = val.slice(0, cursorPos);
    const atMatch = textBefore.match(/@([^\s@]*)$/);
    if (atMatch) {
      const query = atMatch[1] || '';
      mentionPopover.open(query, (student) => {
        const before = val.slice(0, atMatch.index);
        const after = val.slice(cursorPos);
        const insert = `@${student.name} `;
        textarea.value = before + insert + after;
        const newPos = before.length + insert.length;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();

        if (!selectedTaggedFriends.some((f) => f.id === student.id || f.name === student.name)) {
          selectedTaggedFriends.push(student);
          renderExtrasBar();
        }
      });
    } else {
      mentionPopover.close();
    }
  };

  textarea.addEventListener('input', handleMentionCheck);
  textarea.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      handleMentionCheck();
    } else if (e.key === 'Escape') {
      mentionPopover.close();
    }
  });

  // 4. Images Editor Section
  let currentImages: string[] = [...getPostImages(post)];
  const imagesSection = el('div', {
    className: 'edit-post-images-section',
    attrs: { style: 'margin-top: 10px;' },
  });
  const imagesGrid = el('div', { className: 'edit-post-images-grid' });

  const renderPreviews = () => {
    imagesGrid.innerHTML = '';
    if (currentImages.length === 0) {
      imagesSection.style.display = 'none';
      return;
    }
    imagesSection.style.display = 'block';

    currentImages.forEach((src, idx) => {
      const itemWrap = el('div', { className: 'edit-post-image-preview' });
      const img = el('img', {
        className: 'edit-post-image-img',
        attrs: { src, alt: `รูปที่ ${idx + 1}` },
      });
      const removeBtn = el('button', {
        className: 'edit-post-image-remove',
        attrs: { type: 'button', title: 'ลบรูปนี้' },
        text: '✕',
      });
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImages.splice(idx, 1);
        renderPreviews();
      });

      itemWrap.append(img, removeBtn);
      imagesGrid.append(itemWrap);
    });
  };

  imagesSection.append(imagesGrid);
  renderPreviews();

  // 5. Action Row: รูปภาพ | แท็กเพื่อน | ความรู้สึก
  const actionRow = el('div', {
    className: 'create-post-actions',
    attrs: { style: 'margin-top: 14px; padding-top: 10px; border-top: 1px solid #ede8e1;' },
  });
  const attachments = el('div', { className: 'create-post-attachments' });

  // Photo
  const fileInput = el('input', {
    attrs: { type: 'file', accept: 'image/*', multiple: 'true', style: 'display: none;' },
  });
  const photoBtn = el('button', { className: 'attachment-btn', attrs: { type: 'button' } });
  photoBtn.innerHTML = `${postIcons.photo} <span>รูปภาพ</span>`;
  photoBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImageFile(file);
        currentImages.push(compressed);
      } catch {
        // ignore
      }
    }
    fileInput.value = '';
    renderPreviews();
  });

  // Tag Friends
  const tagFriendBtn = el('button', { className: 'attachment-btn', attrs: { type: 'button' } });
  tagFriendBtn.innerHTML = `${postIcons.tag} <span>แท็กเพื่อน</span>`;
  tagFriendBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    textarea.focus();
    const val = textarea.value;
    const cursorPos = textarea.selectionStart || val.length;
    const textBefore = val.slice(0, cursorPos);
    const atMatch = textBefore.match(/@([^\s@]*)$/);
    let query = '';
    if (!atMatch) {
      const needSpace = cursorPos > 0 && !/\s$/.test(textBefore);
      const insert = (needSpace ? ' ' : '') + '@';
      const before = val.slice(0, cursorPos);
      const after = val.slice(cursorPos);
      textarea.value = before + insert + after;
      const newPos = cursorPos + insert.length;
      textarea.setSelectionRange(newPos, newPos);
    } else {
      query = atMatch[1] || '';
    }
    mentionPopover.open(query, (student) => {
      const curVal = textarea.value;
      const curPos = textarea.selectionStart || curVal.length;
      const curBefore = curVal.slice(0, curPos);
      const match = curBefore.match(/@([^\s@]*)$/);
      if (match) {
        const b = curVal.slice(0, match.index);
        const a = curVal.slice(curPos);
        const ins = `@${student.name} `;
        textarea.value = b + ins + a;
        const np = b.length + ins.length;
        textarea.setSelectionRange(np, np);
      }
      textarea.focus();
      if (!selectedTaggedFriends.some((f) => f.id === student.id || f.name === student.name)) {
        selectedTaggedFriends.push(student);
        renderExtrasBar();
      }
    });
  });

  // Feeling
  const feelingWrap = el('div', { attrs: { style: 'position: relative;' } });
  const feelingBtn = el('button', { className: 'attachment-btn', attrs: { type: 'button' } });
  feelingBtn.innerHTML = `${postIcons.feeling} <span>ความรู้สึก</span>`;

  const feelingPopover = el('div', {
    className: 'feeling-picker-popover',
    attrs: { style: 'display: none;' },
  });
  const feelingTitle = el('div', { className: 'feeling-picker-title', text: 'คุณรู้สึกอย่างไร?' });
  const feelingGrid = el('div', { className: 'feeling-picker-grid' });

  FEELING_OPTIONS.forEach((item) => {
    const btn = el('button', {
      className: 'feeling-picker-btn',
      attrs: { type: 'button' },
    });
    btn.innerHTML = `<span class="feeling-emoji">${item.emoji}</span><span>${item.label}</span>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedFeeling = item;
      feelingPopover.style.display = 'none';
      renderExtrasBar();
    });
    feelingGrid.append(btn);
  });

  feelingPopover.append(feelingTitle, feelingGrid);
  feelingWrap.append(feelingBtn, feelingPopover);

  feelingBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = feelingPopover.style.display === 'none';
    feelingPopover.style.display = isHidden ? 'block' : 'none';
  });

  document.addEventListener('click', (e) => {
    if (!feelingWrap.contains(e.target as Node)) {
      feelingPopover.style.display = 'none';
    }
    if (!modal.contains(e.target as Node)) {
      mentionPopover.close();
    }
  });

  const postBtn = el('button', {
    className: 'btn-post',
    text: 'โพสต์',
    attrs: { type: 'button' },
  });

  attachments.append(photoBtn, tagFriendBtn, feelingWrap, fileInput);
  actionRow.append(attachments, postBtn);

  modalBody.append(textarea, extrasBar, imagesSection, actionRow);

  modal.append(modalHeader, modalBody);
  overlay.append(modal);

  const closeModal = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  postBtn.addEventListener('click', async () => {
    const newText = textarea.value.trim();
    if (!newText && currentImages.length === 0) {
      toast.error('กรุณาระบุข้อความหรือใส่รูปภาพอย่างน้อย 1 รูป');
      return;
    }

    const finalContent = newText || (currentImages.length > 0 ? '[รูปภาพ]' : '');

    postBtn.disabled = true;
    postBtn.textContent = 'กำลังบันทึก...';

    try {
      // 1. Save edit history in localStorage (content + images)
      const historyKey = `post_edit_history_${post._id}`;
      interface EditHistoryItem {
        content: string;
        images?: string[];
        editedAt: string;
        version: number;
      }
      let history: EditHistoryItem[] = [];
      try {
        const raw = localStorage.getItem(historyKey);
        if (raw) history = JSON.parse(raw);
      } catch {
        // ignore
      }

      if (history.length === 0) {
        const originalContent = (post.content || '').trim() === '[รูปภาพ]' ? '' : (post.content || '');
        const originalImages = getPostImages(post);
        history.push({
          version: 1,
          content: originalContent,
          images: originalImages,
          editedAt: post.createdAt || new Date().toISOString(),
        });
      }

      const nowIso = new Date().toISOString();
      history.push({
        version: history.length + 1,
        content: newText,
        images: [...currentImages],
        editedAt: nowIso,
      });

      localStorage.setItem(historyKey, JSON.stringify(history));

      // 2. Update local post images
      try {
        const localPostImages = JSON.parse(localStorage.getItem('local_post_images') || '{}') as Record<string, string[]>;
        localPostImages[post._id] = currentImages;
        localStorage.setItem('local_post_images', JSON.stringify(localPostImages));
        localStorage.setItem(`post_cover_${post._id}`, JSON.stringify(currentImages));
      } catch {
        // ignore
      }

      // 3. Update post meta (feeling & tagged friends)
      try {
        currentMeta.feeling = selectedFeeling;
        currentMeta.taggedFriends = selectedTaggedFriends;
        localStorage.setItem(`post_meta_${post._id}`, JSON.stringify(currentMeta));
      } catch {
        // ignore
      }

      // 4. Call API update
      const cover = currentImages[0] || null;
      await postsApi.update(post._id, {
        title: post.title || 'อัปเดตโปรเจกต์',
        content: finalContent,
        coverImage: cover,
        status: post.status || 'published',
        tags: post.tags,
      });

      // 5. Update local Post object
      post.content = finalContent;
      post.coverImage = cover;
      post.updatedAt = nowIso;

      // 6. Update DOM on the postCard
      // A. Feeling in post header
      let feelingEl = card.querySelector<HTMLElement>('.post-feeling-text');
      if (selectedFeeling) {
        if (feelingEl) {
          feelingEl.textContent = `— รู้สึก ${selectedFeeling.emoji} ${selectedFeeling.label}`;
        } else {
          feelingEl = el('span', {
            className: 'post-feeling-text',
            text: `— รู้สึก ${selectedFeeling.emoji} ${selectedFeeling.label}`,
          });
          const authorEl = card.querySelector('.post-author-name');
          if (authorEl) authorEl.after(feelingEl);
        }
      } else if (feelingEl) {
        feelingEl.remove();
      }

      // B. Body Text with clickable mentions
      let bodyEl = card.querySelector<HTMLElement>('.post-body-text');
      if (newText) {
        if (!bodyEl) {
          bodyEl = el('div', { className: 'post-body-text' });
          const mediaGrid = card.querySelector('.post-images-grid');
          if (mediaGrid) mediaGrid.before(bodyEl);
          else {
            const headerEl = card.querySelector('.post-header');
            if (headerEl) headerEl.after(bodyEl);
          }
        }
        bodyEl.innerHTML = '';
        const parts = newText.split(/(@[^\s@]+)/g);
        parts.forEach((part) => {
          if (part.startsWith('@') && part.length > 1) {
            const mentionClean = part.slice(1);
            const tagSpan = el('span', {
              className: 'post-mention-tag',
              attrs: { title: `ดูโปรไฟล์ของ ${mentionClean}` },
              text: part,
            });
            tagSpan.addEventListener('click', (ev) => {
              ev.stopPropagation();
              openProfilePreviewModal({ name: mentionClean });
            });
            bodyEl!.append(tagSpan);
          } else if (part) {
            bodyEl!.append(document.createTextNode(part));
          }
        });
      } else if (bodyEl) {
        bodyEl.remove();
      }

      // C. Images
      const oldGrid = card.querySelector('.post-images-grid');
      if (oldGrid) oldGrid.remove();

      const newGrid = renderPostImagesGrid(currentImages, post.title);
      if (newGrid) {
        const currentBody = card.querySelector('.post-body-text');
        if (currentBody) {
          currentBody.after(newGrid);
        } else {
          const headerEl = card.querySelector('.post-header');
          if (headerEl) headerEl.after(newGrid);
        }
      }

      toast.success('แก้ไขโพสต์เรียบร้อยแล้ว');
      if (onEdited) onEdited(finalContent);
      closeModal();
    } catch (error) {
      toast.error(errorMessage(error));
      postBtn.disabled = false;
      postBtn.textContent = 'โพสต์';
    }
  });

  document.body.style.overflow = 'hidden';
  document.body.append(overlay);
  setTimeout(() => textarea.focus(), 100);
}

export function openEditHistoryModal(post: Post, authorName: string): void {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'edit-post-modal' });

  const modalHeader = el('div', { className: 'edit-post-modal__header' });
  const titleBox = el('div', {});
  const modalTitle = el('h3', { className: 'edit-post-modal__title', text: 'ประวัติการแก้ไขโพสต์' });
  const modalSubtitle = el('p', {
    attrs: { style: 'font-size: 0.8rem; color: #8c827a; margin: 4px 0 0 0;' },
    text: `โพสต์โดย ${authorName}`,
  });
  titleBox.append(modalTitle, modalSubtitle);

  const closeBtn = el('button', {
    className: 'edit-post-modal__close-btn',
    attrs: { type: 'button', 'aria-label': 'ปิด' },
    text: '✕',
  });
  modalHeader.append(titleBox, closeBtn);

  const modalBody = el('div', {
    className: 'edit-post-modal__body',
    attrs: { style: 'max-height: 60vh; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;' },
  });

  // Read history
  const historyKey = `post_edit_history_${post._id}`;
  interface HistoryEntry {
    content: string;
    images?: string[];
    editedAt: string;
    version: number;
  }
  let history: HistoryEntry[] = [];
  try {
    const raw = localStorage.getItem(historyKey);
    if (raw) history = JSON.parse(raw);
  } catch {
    // ignore
  }

  const renderVersionCard = (item: {
    badgeText: string;
    badgeClass: string;
    timeText: string;
    content: string;
    images?: string[] | undefined;
  }) => {
    const card = el('div', {
      className: `history-version-card ${item.badgeClass.includes('current') ? 'history-version-card--current' : ''}`,
    });
    const meta = el('div', { className: 'history-version-meta' });
    meta.innerHTML = `<span class="${item.badgeClass}">${item.badgeText}</span> • ${item.timeText}`;

    const cleanText = item.content.trim() === '[รูปภาพ]' ? '' : item.content.trim();
    const text = el('div', {
      className: 'history-version-content',
      text: cleanText || (item.images && item.images.length > 0 ? '(ไม่มีข้อความ มีเฉพาะรูปภาพ)' : '(ว่าง)'),
    });
    card.append(meta, text);

    if (item.images && item.images.length > 0) {
      const imagesRow = el('div', { className: 'history-version-images' });
      item.images.forEach((imgSrc, imgIdx) => {
        const thumb = el('img', {
          className: 'history-version-thumb',
          attrs: { src: imgSrc, alt: `รูปที่ ${imgIdx + 1}`, title: 'คลิกเพื่อดูรูปขยาย' },
        });
        thumb.addEventListener('click', (e) => {
          e.stopPropagation();
          openLightbox(item.images!, imgIdx);
        });
        imagesRow.append(thumb);
      });
      card.append(imagesRow);
    }
    return card;
  };

  if (history.length === 0) {
    const currentImages = getPostImages(post);
    const currentClean = (post.content || '').trim() === '[รูปภาพ]' ? '' : (post.content || '');

    const currentCard = renderVersionCard({
      badgeText: 'เวอร์ชันปัจจุบัน',
      badgeClass: 'history-badge history-badge--current',
      timeText: `แก้ไขเมื่อ ${formatRelativeTime(post.updatedAt || new Date().toISOString())}`,
      content: currentClean,
      images: currentImages,
    });

    const origCard = renderVersionCard({
      badgeText: 'ต้นฉบับ',
      badgeClass: 'history-badge',
      timeText: `โพสต์เมื่อ ${formatRelativeTime(post.createdAt)}`,
      content: 'โพสต์แรกเริ่มก่อนการแก้ไข',
      images: currentImages,
    });

    modalBody.append(currentCard, origCard);
  } else {
    const reversed = [...history].reverse();
    reversed.forEach((item, index) => {
      const isLatest = index === 0;
      const badgeText = isLatest
        ? 'เวอร์ชันปัจจุบัน'
        : item.version === 1
        ? 'ต้นฉบับ'
        : `เวอร์ชันที่ ${item.version}`;
      const badgeClass = isLatest ? 'history-badge history-badge--current' : 'history-badge';
      const timeText = `${formatDate(item.editedAt)} (${formatRelativeTime(item.editedAt)})`;

      const card = renderVersionCard({
        badgeText,
        badgeClass,
        timeText,
        content: item.content,
        images: item.images,
      });
      modalBody.append(card);
    });
  }

  const modalFooter = el('div', { className: 'edit-post-modal__footer' });
  const dismissBtn = el('button', {
    className: 'edit-post-modal__save-btn',
    attrs: { type: 'button' },
    text: 'ปิด',
  });
  modalFooter.append(dismissBtn);

  modal.append(modalHeader, modalBody, modalFooter);
  overlay.append(modal);

  const closeModal = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };

  closeBtn.addEventListener('click', closeModal);
  dismissBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.body.style.overflow = 'hidden';
  document.body.append(overlay);
}

import { authStore } from '../../core/auth/auth-store';
import { env } from '../../config/env';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { confirmAction } from '../../core/ui/confirm-dialog';
import { authorName, formatDate, formatRelativeTime } from '../../core/utils/format';
import { paginationWindow } from '../../core/utils/pagination';
import type { Post } from '../../types/api';
import { getFriendUser, respondFriendRequest, sendFriendRequest, type FriendUser } from '../friends/friends-api';
import { openProfilePreviewModal } from '../profile/profile-modal';
import {
  createMentionPopover,
  FEELING_OPTIONS,
  type FeelingItem,
  type StudentTagItem,
} from './mention-tag';
import { postsApi } from './posts-api';
import { mountPostSocial } from './post-social';

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

export function getPostImages(post: Post): string[] {
  const media = (post.media ?? post.attachments ?? [])
    .filter((item) => item.mimeType.startsWith('image/')).map((item) => item.url);
  const images = post.images?.length ? post.images : media.length ? media : post.coverImage ? [post.coverImage] : [];
  return [...new Set(images.filter(Boolean).map((path) =>
    /^(https?:|data:|blob:)/i.test(path) ? path : new URL(path, env.apiBaseUrl).href))];
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
    friendshipStatus?: FriendUser['relationshipStatus'];
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
  const authorId = typeof authorData === 'string' ? authorData
    : typeof authorObj?._id === 'string' ? authorObj._id : '';
  const currentUser = authStore.snapshot.user;
  const isMine = Boolean(options.mine || (currentUser && currentUser._id === authorId));

  let finalAuthorName = authorDisplayName;
  let avatarLetter = 'ส';

  if (isMine && currentUser) {
    finalAuthorName = currentUser.name || authorDisplayName;
    avatarLetter = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'ส';
  } else if (authorDisplayName) {
    avatarLetter = authorDisplayName.charAt(0).toUpperCase();
  }

  // Profile fields come from the API, including populated authors on public posts.
  let authorDept = typeof authorObj?.department === 'string' ? authorObj.department : '';
  let authorFaculty = typeof authorObj?.faculty === 'string' ? authorObj.faculty : '';
  if (isMine && currentUser) {
    authorDept = currentUser.department ?? authorDept;
    authorFaculty = currentUser.faculty ?? authorFaculty;
  }
  if (options.isSample) {
    authorDept ||= 'ภาควิชาวิศวกรรมคอมพิวเตอร์';
    authorFaculty ||= 'คณะวิศวกรรมศาสตร์';
  }
  authorDept ||= 'ยังไม่ระบุภาควิชา';

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

  let syncFriendButtonStatus: ((newStatus: FriendUser['relationshipStatus']) => void) | null = null;

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

  nameLine.append(author);
  if (post.feeling) {
    const feelingSpan = el('span', {
      className: 'post-feeling-text',
      text: `— รู้สึก ${post.feeling}`,
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
  const isEdited = Boolean(post.updatedAt && post.createdAt &&
    new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > 2000);

  // Timestamp Line (เวลาที่โพสต์)
  const timestamp = el('div', { className: 'post-timestamp' });
  const timeSpan = el('span', {
    attrs: { title: formatDate(post.createdAt) },
    text: formatRelativeTime(post.createdAt),
  });
  timestamp.append(timeSpan);

  const renderEditedTag = () => {
    return el('span', {
      className: 'post-edited-tag',
      text: '• มีการแก้ไข',
    });
  };

  if (isEdited) {
    timestamp.append(renderEditedTag());
  }

  deptLine.append(el('span', { className: 'post-dot-sep', text: '•' }), timestamp);
  details.append(nameLine, deptLine);
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

    const deleteItem = el('button', {
      className: 'post-dropdown-item post-dropdown-item--danger',
      attrs: { type: 'button' },
    });
    deleteItem.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> ลบ`;

    const updateDropdownItems = () => {
      dropdown.innerHTML = '';
      dropdown.append(editItem);
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

    editItem.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = 'none';
      openEditPostModal(post, card);
    });

    deleteItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      dropdown.style.display = 'none';
      const confirmed = await confirmAction({
        title: 'ยืนยันการลบโพสต์',
        message: 'ต้องการลบโพสต์นี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้',
        confirmText: 'ลบโพสต์',
        danger: true,
      });
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
    let currentFriendStatus: FriendUser['relationshipStatus'] = options.friendshipStatus || 'none';
    let requestId: string | null = null;
    const canConnect = /^[a-f\d]{24}$/i.test(authorId);

    const friendBtn = el('button', {
      className: 'post-friend-btn',
      attrs: { type: 'button' },
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
        authStore.snapshot.status !== 'authenticated'
          ? 'เข้าสู่ระบบ'
          : newStatus === 'friends'
          ? 'แชท'
          : newStatus === 'pending_sent'
          ? 'ส่งคำขอแล้ว'
          : newStatus === 'pending_received'
          ? 'ยอมรับคำขอ'
          : '+ เพิ่มเพื่อน';
      friendBtn.disabled = newStatus === 'pending_sent' || !canConnect;
    };
    syncFriendButtonStatus(currentFriendStatus);

    friendBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (authStore.snapshot.status !== 'authenticated') {
        window.history.pushState(null, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
      if (!canConnect || currentFriendStatus === 'pending_sent') return;
      if (currentFriendStatus === 'friends') {
        window.history.pushState(null, '', `/chat?userId=${encodeURIComponent(authorId)}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
      friendBtn.disabled = true;
      friendBtn.textContent = 'กำลังดำเนินการ...';
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
          toast.success(`ส่งคำขอเป็นเพื่อนไปยัง ${finalAuthorName} แล้ว`);
        }
      } catch (cause) {
        toast.error(errorMessage(cause));
      } finally {
        syncFriendButtonStatus?.(currentFriendStatus);
      }
    });

    if (canConnect) {
      header.append(authorInfo, friendBtn);
      if (authStore.snapshot.status === 'authenticated') {
        void getFriendUser(authorId).then((friend) => {
          requestId = friend.requestId;
          syncFriendButtonStatus?.(friend.relationshipStatus);
        }).catch(() => undefined);
      }
    } else {
      header.append(authorInfo);
    }
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
  const imagesList = getPostImages(post);
  const mediaGrid = renderPostImagesGrid(imagesList, post.title);
  if (mediaGrid) {
    card.append(mediaGrid);
  }
  if (post.attachments?.length) {
    const attachmentList = el('div', { className: 'post-attachments-list' });
    for (const attachment of post.attachments) {
      const url = new URL(attachment.url, env.apiBaseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) continue;
      attachmentList.append(el('a', {
        className: 'post-attachment-link',
        text: `📎 ${attachment.name}`,
        attrs: { href: url.href, target: '_blank', rel: 'noopener noreferrer' },
      }));
    }
    if (attachmentList.childElementCount) card.append(attachmentList);
  }

  if (post.status === 'published') mountPostSocial(card, post, authorId, finalAuthorName);

  return card;
}

export function pagination(
  current: number,
  total: number,
  search: string,
  basePath: string,
  extraQuery: Record<string, string> = {},
): HTMLElement | null {
  if (total <= 1) return null;

  const nav = el('nav', { className: 'pagination', attrs: { 'aria-label': 'การแบ่งหน้า' } });
  const buildHref = (page: number): string => {
    const query = new URLSearchParams();
    query.set('page', String(page));
    if (search) query.set('search', search);
    for (const [key, value] of Object.entries(extraQuery)) query.set(key, value);
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

  let selectedFeeling: FeelingItem | null = FEELING_OPTIONS.find(
    (item) => `${item.emoji} ${item.label}` === post.feeling,
  ) ?? null;
  const selectedTaggedFriends: StudentTagItem[] = (post.taggedFriends ?? []).map((id) => ({
    id, name: id, studentId: '', university: '', avatarLetter: '@',
  }));

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
      const friendText = el('span', { text: `แท็ก: @${friend.name}${friend.studentId ? ` (${friend.studentId})` : ''}` });
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
  const currentImages: string[] = [...getPostImages(post)];
  const pendingFiles = new Map<string, File>();
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
        pendingFiles.delete(src);
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
    attrs: { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', multiple: 'true', style: 'display: none;' },
  });
  const photoBtn = el('button', { className: 'attachment-btn', attrs: { type: 'button' } });
  photoBtn.innerHTML = `${postIcons.photo} <span>รูปภาพ</span>`;
  photoBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;
    if (currentImages.length + files.length > 4) {
      toast.error('แนบรูปภาพได้สูงสุด 4 รูป');
      fileInput.value = '';
      return;
    }

    for (const file of Array.from(files)) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast.error(`ไม่รองรับไฟล์ ${file.name}`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`รูป ${file.name} มีขนาดเกิน 10 MB`);
        continue;
      }
      try {
        const compressed = await compressImageFile(file);
        currentImages.push(compressed);
        pendingFiles.set(compressed, file);
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

    postBtn.disabled = true;
    postBtn.textContent = 'กำลังบันทึก...';
    try {
      const images = await Promise.all(currentImages.map(async (image) => {
        const file = pendingFiles.get(image);
        if (!file) return image;
        const upload = await postsApi.upload(file);
        return upload.data.asset.url;
      }));
      const content = newText;
      const result = await postsApi.update(post._id, {
        title: post.title || content.slice(0, 50),
        content,
        status: post.status,
        tags: post.tags,
        coverImage: images[0] ?? null,
        images,
        feeling: selectedFeeling ? selectedFeeling.emoji + ' ' + selectedFeeling.label : null,
        taggedFriends: selectedTaggedFriends.map((friend) => friend.id),
      });
      Object.assign(post, result.data.post);
      card.replaceWith(postCard(post, { mine: true }));
      onEdited?.(content);
      toast.success('แก้ไขโพสต์เรียบร้อยแล้ว');
      closeModal();
    } catch (error) {
      toast.error(errorMessage(error));
      postBtn.disabled = false;
      postBtn.textContent = 'บันทึก';
    }
  });

  document.body.style.overflow = 'hidden';
  document.body.append(overlay);
  setTimeout(() => textarea.focus(), 100);
}

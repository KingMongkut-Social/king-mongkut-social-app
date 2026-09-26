import { requireMember } from '../../core/auth/auth-navigation';
import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import type { Post } from '../../types/api';
import { searchFriends, type FriendUser } from '../friends/friends-api';
import { postsApi } from './posts-api';
import { openLightbox, pagination, postCard } from './post-components';
import {
  createMentionPopover,
  FEELING_OPTIONS,
  type FeelingItem,
  type StudentTagItem,
} from './mention-tag';

const icons = {
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

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function postsPage(context: RouteContext): Promise<PageView> {
  const page = positiveInteger(context.query.get('page'), 1);
  const search = (context.query.get('search') ?? '').trim().slice(0, 100);

  let posts: Post[] = [];
  let pages = 1;

  try {
    const result = await postsApi.listPublished({ page, limit: 10, ...(search ? { search } : {}) });
    posts = result.data.items;
    pages = result.data.pages;
  } catch {
    // If backend is idle or empty, graceful fallback
  }

  let allFriends: FriendUser[] = [];
  try {
    allFriends = await searchFriends();
    allFriends.forEach((u) => {
      if (u.relationshipStatus === 'friends') {
        localStorage.setItem(`friend_status_${u.id}`, 'friends');
        localStorage.setItem(`friend_status_${u.name}`, 'friends');
      } else if (u.relationshipStatus === 'pending_sent') {
        localStorage.setItem(`friend_status_${u.id}`, 'pending_sent');
        localStorage.setItem(`friend_status_${u.name}`, 'pending_sent');
      }
    });
  } catch {
    // ignore
  }

  const container = el('div', { className: 'feed-layout' });

  // --- Left Column: Main Feed ---
  const feedMain = el('div', { className: 'feed-main' });

  // 1. Create Post Box ("คุณกำลังคิดอะไรอยู่?")
  const createBox = el('div', { className: 'create-post-card' });
  const topRow = el('div', { className: 'create-post-top' });

  const currentUser = authStore.snapshot.user;
  const avatarLetter = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'ส';
  const avatar = el('div', {
    className: 'post-avatar',
    attrs: { title: currentUser?.name || 'โปรไฟล์ของคุณ' },
    text: avatarLetter,
  });


  const postInput = el('textarea', {
    className: 'create-post-input-box',
    attrs: {
      placeholder: 'คุณกำลังคิดอะไรอยู่?',
      rows: '2',
    },
  });

  topRow.append(avatar, postInput);

  // Extras Bar (Selected feelings & tagged friends)
  let selectedFeeling: FeelingItem | null = null;
  let selectedTaggedFriends: StudentTagItem[] = [];

  const extrasBar = el('div', {
    className: 'create-post-extras-bar',
    attrs: { style: 'display: none;' },
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

  // Mention Autocomplete Popover
  const mentionPopover = createMentionPopover(createBox);

  const handleMentionCheck = () => {
    const val = postInput.value;
    const cursorPos = postInput.selectionStart || 0;
    const textBefore = val.slice(0, cursorPos);
    const atMatch = textBefore.match(/@([^\s@]*)$/);
    if (atMatch) {
      const query = atMatch[1] || '';
      mentionPopover.open(query, (student) => {
        const before = val.slice(0, atMatch.index);
        const after = val.slice(cursorPos);
        const insert = `@${student.name} `;
        postInput.value = before + insert + after;
        const newPos = before.length + insert.length;
        postInput.setSelectionRange(newPos, newPos);
        postInput.focus();

        if (!selectedTaggedFriends.some((f) => f.id === student.id || f.name === student.name)) {
          selectedTaggedFriends.push(student);
          renderExtrasBar();
        }
      });
    } else {
      mentionPopover.close();
    }
  };

  postInput.addEventListener('input', handleMentionCheck);
  postInput.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      handleMentionCheck();
    } else if (e.key === 'Escape') {
      mentionPopover.close();
    }
  });

  document.addEventListener('click', (e) => {
    if (!createBox.contains(e.target as Node)) {
      mentionPopover.close();
    }
  });

  // Image attachment & preview handling (supports multiple images)
  const fileInput = el('input', {
    attrs: {
      type: 'file',
      accept: 'image/*',
      multiple: 'true',
      style: 'display: none;',
    },
  });

  const previewContainer = el('div', {
    className: 'create-post-previews-grid',
    attrs: { style: 'display: none;' },
  });

  let currentImages: string[] = [];

  try {
    const savedList = localStorage.getItem('draft_post_images');
    if (savedList) {
      const parsed = JSON.parse(savedList) as unknown;
      if (Array.isArray(parsed)) currentImages = parsed.map(String).filter(Boolean);
    } else {
      const singleSaved = localStorage.getItem('draft_post_image');
      if (singleSaved) currentImages = [singleSaved];
    }
  } catch {
    // ignore
  }

  const saveDraftImages = (): void => {
    try {
      localStorage.setItem('draft_post_images', JSON.stringify(currentImages));
    } catch {
      // ignore
    }
  };

  const renderPreview = (): void => {
    previewContainer.innerHTML = '';
    if (currentImages.length === 0) {
      previewContainer.style.display = 'none';
      return;
    }

    previewContainer.style.display = 'grid';

    currentImages.forEach((imgSrc, index) => {
      const thumbWrap = el('div', { className: 'preview-thumb-item' });
      const imgEl = el('img', {
        attrs: { src: imgSrc, alt: `รูปตัวอย่างที่ ${index + 1}` },
      });
      imgEl.addEventListener('click', () => {
        openLightbox(currentImages, index);
      });

      const removeBtn = el('button', {
        className: 'preview-thumb-remove',
        attrs: { type: 'button', 'aria-label': 'ลบรูปภาพนี้', title: 'ลบรูปภาพ' },
        text: '✕',
      });
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImages.splice(index, 1);
        saveDraftImages();
        renderPreview();
      });

      thumbWrap.append(imgEl, removeBtn);
      previewContainer.append(thumbWrap);
    });

    // "+ เพิ่มรูป" button inside grid
    const addMoreBtn = el('button', {
      className: 'preview-add-more-btn',
      attrs: { type: 'button' },
    });
    addMoreBtn.innerHTML = `<span>+</span><span>เพิ่มรูป</span>`;
    addMoreBtn.addEventListener('click', () => fileInput.click());
    previewContainer.append(addMoreBtn);
  };

  renderPreview();

  const clearSelectedImages = (): void => {
    currentImages = [];
    renderPreview();
    fileInput.value = '';
    try {
      localStorage.removeItem('draft_post_images');
      localStorage.removeItem('draft_post_image');
    } catch {
      // ignore
    }
  };

  const actionRow = el('div', { className: 'create-post-actions' });
  const attachments = el('div', { className: 'create-post-attachments' });

  // Photo Button
  const photoBtn = el('button', { className: 'attachment-btn', attrs: { type: 'button' } });
  photoBtn.innerHTML = `${icons.photo} <span>รูปภาพ</span>`;
  photoBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // Tag Friends Button
  const tagFriendBtn = el('button', { className: 'attachment-btn', attrs: { type: 'button' } });
  tagFriendBtn.innerHTML = `${icons.tag} <span>แท็กเพื่อน</span>`;
  tagFriendBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    postInput.focus();
    const val = postInput.value;
    const cursorPos = postInput.selectionStart || val.length;
    const textBefore = val.slice(0, cursorPos);
    const atMatch = textBefore.match(/@([^\s@]*)$/);
    let query = '';
    if (!atMatch) {
      const needSpace = cursorPos > 0 && !/\s$/.test(textBefore);
      const insert = (needSpace ? ' ' : '') + '@';
      const before = val.slice(0, cursorPos);
      const after = val.slice(cursorPos);
      postInput.value = before + insert + after;
      const newPos = cursorPos + insert.length;
      postInput.setSelectionRange(newPos, newPos);
    } else {
      query = atMatch[1] || '';
    }
    mentionPopover.open(query, (student) => {
      const curVal = postInput.value;
      const curPos = postInput.selectionStart || curVal.length;
      const curBefore = curVal.slice(0, curPos);
      const match = curBefore.match(/@([^\s@]*)$/);
      if (match) {
        const b = curVal.slice(0, match.index);
        const a = curVal.slice(curPos);
        const ins = `@${student.name} `;
        postInput.value = b + ins + a;
        const np = b.length + ins.length;
        postInput.setSelectionRange(np, np);
      }
      postInput.focus();
      if (!selectedTaggedFriends.some((f) => f.id === student.id || f.name === student.name)) {
        selectedTaggedFriends.push(student);
        renderExtrasBar();
      }
    });
  });

  // Feeling Picker Button & Dropdown
  const feelingWrap = el('div', { attrs: { style: 'position: relative;' } });
  const feelingBtn = el('button', { className: 'attachment-btn', attrs: { type: 'button' } });
  feelingBtn.innerHTML = `${icons.feeling} <span>ความรู้สึก</span>`;

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
  });

  fileInput.addEventListener('change', async () => {
    const files = fileInput.files;
    if (!files || files.length === 0) return;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file) {
          const dataUrl = await compressImageFile(file);
          currentImages.push(dataUrl);
        }
      }
      saveDraftImages();
      renderPreview();
    } catch (err: unknown) {
      toast.error('ไม่สามารถโหลดรูปภาพได้: ' + errorMessage(err));
    } finally {
      fileInput.value = '';
    }
  });

  attachments.append(photoBtn, tagFriendBtn, feelingWrap, fileInput);

  const postBtn = el('button', {
    className: 'btn-post',
    text: 'โพสต์',
    attrs: { type: 'button' },
  });

  postBtn.addEventListener('click', async () => {
    const text = postInput.value.trim();
    if (!text && currentImages.length === 0) {
      toast.error('กรุณากรอกข้อความหรือเลือกรูปภาพก่อนโพสต์');
      return;
    }
    if (!requireMember()) return;
    try {
      const postTitle = text ? text.slice(0, 50) : 'รูปภาพ';
      const postContent = text || '[รูปภาพ]';
      const result = await postsApi.create({
        title: postTitle,
        content: postContent,
        status: 'published',
        tags: [authStore.snapshot.user?.university || 'KMITL'],
      });
      const newPostId = result.data?.post?._id;
      const currentUser = authStore.snapshot.user;
      if (newPostId) {
        try {
          const meta = {
            authorName: currentUser?.name,
            authorInitial: currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'ส',
            department: currentUser?.department || 'ภาควิชาวิศวกรรมคอมพิวเตอร์',
            faculty: currentUser?.faculty || 'คณะวิศวกรรมศาสตร์',
            feeling: selectedFeeling,
            taggedFriends: selectedTaggedFriends,
          };
          localStorage.setItem(`post_meta_${newPostId}`, JSON.stringify(meta));
        } catch {
          // ignore
        }
      }
      if (newPostId && currentImages.length > 0) {
        try {
          const localPostImages = JSON.parse(localStorage.getItem('local_post_images') || '{}') as Record<string, string[]>;
          localPostImages[newPostId] = currentImages;
          localStorage.setItem('local_post_images', JSON.stringify(localPostImages));
          localStorage.setItem(`post_cover_${newPostId}`, JSON.stringify(currentImages));
        } catch {
          // ignore
        }
      }
      clearSelectedImages();
      selectedFeeling = null;
      selectedTaggedFriends = [];
      renderExtrasBar();
      toast.success('เผยแพร่โพสต์เรียบร้อยแล้ว!');
      postInput.value = '';
      window.location.reload();
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    }
  });

  actionRow.append(attachments, postBtn);
  createBox.append(topRow, extrasBar, previewContainer, actionRow);

  // 2. Filter Bar (Faculty, Department, Burgundy Filter Button)
  const filterBar = el('div', { className: 'feed-filter-bar' });

  const facultyGroup = el('div', { className: 'filter-group' });
  facultyGroup.append(
    el('label', { className: 'filter-label', text: 'คณะ' }),
    el('select', { className: 'filter-select' },
      el('option', { text: 'ทุกคณะ' }),
      el('option', { text: 'วิศวกรรมศาสตร์' }),
      el('option', { text: 'เทคโนโลยีสารสนเทศ' }),
      el('option', { text: 'วิทยาศาสตร์' }),
      el('option', { text: 'ครุศาสตร์อุตสาหกรรม' }),
    ),
  );

  const deptGroup = el('div', { className: 'filter-group' });
  deptGroup.append(
    el('label', { className: 'filter-label', text: 'ภาควิชา' }),
    el('select', { className: 'filter-select' },
      el('option', { text: 'ทุกภาควิชา' }),
      el('option', { text: 'วิศวกรรมคอมพิวเตอร์' }),
      el('option', { text: 'วิศวกรรมหุ่นยนต์และปัญญาประดิษฐ์ (AI)' }),
      el('option', { text: 'วิศวกรรมไฟฟ้า' }),
      el('option', { text: 'เทคโนโลยีสารสนเทศ' }),
    ),
  );

  const filterButton = el('button', {
    className: 'btn-burgundy-filter',
    text: 'กรองข้อมูล',
    attrs: { type: 'button' },
  });
  filterButton.addEventListener('click', () => {
    toast.info('กรองข้อมูลฟีดเรียบร้อย');
  });

  filterBar.append(facultyGroup, deptGroup, filterButton);

  feedMain.append(createBox, filterBar);

  // 3. Posts List
  // If there are real posts in DB, render them
  if (posts.length > 0) {
    posts.forEach((p) => feedMain.append(postCard(p)));
  } else {
    // If no posts or first load, show sample featured post in Thai!
    const samplePost: Post = {
      _id: 'sample-sarah-jenkins',
      title: 'ตัวต้นแบบ Alpha Build',
      content: 'เพิ่งทดสอบตัวต้นแบบโปรเจกต์จบชิ้นแรกเสร็จสมบูรณ์! การทำงานของเซ็นเซอร์ตัวใหม่เสถียรกว่าที่คาดไว้มาก ขั้นต่อไปเตรียมทดสอบด้านความร้อนและประสิทธิภาพ (Thermal testing) 🔬✨',
      status: 'published',
      tags: ['KMITL (สจล.)'],
      coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
      author: {
        _id: 'user-sarah',
        name: 'Sarah Jenkins',
        email: 'sarah@kmitl.ac.th',
        university: 'KMITL (สจล.)',
      },
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    };
    feedMain.append(postCard(samplePost, { isSample: true }));
  }

  const pager = pagination(page, pages, search, '/');
  if (pager) feedMain.append(pager);

  // --- Right Column: Widgets ---
  const widgets = el('div', { className: 'feed-widgets' });

  // Widget 1: Friends List (รายชื่อเพื่อนทั้งหมด)
  interface FriendDisplayItem {
    name: string;
    initial: string;
    university?: string;
    isOnline: boolean;
  }

  const defaultFriends: FriendDisplayItem[] = [
    { name: 'David Chen (KMUTT)', initial: 'D', university: 'KMUTT', isOnline: true },
    { name: 'Supinya P. (KMITL)', initial: 'S', university: 'KMITL', isOnline: true },
    { name: 'Emily Rodriguez (KMUTNB)', initial: 'E', university: 'KMUTNB', isOnline: false },
    { name: 'Nattawut K. (KMUTT)', initial: 'N', university: 'KMUTT', isOnline: false },
    { name: 'Chaiwat S. (KMUTNB)', initial: 'C', university: 'KMUTNB', isOnline: false },
  ];

  let friendItems: FriendDisplayItem[] = [...defaultFriends];

    const confirmedFriends = allFriends.filter((u) => u.relationshipStatus === 'friends');
    if (confirmedFriends.length > 0) {
      const realItems: FriendDisplayItem[] = confirmedFriends.map((u, index) => {
        const uniSuffix = u.university ? ` (${u.university})` : '';
        return {
          name: `${u.name}${uniSuffix}`,
          initial: u.name.charAt(0).toUpperCase(),
          university: u.university,
          isOnline: index % 2 === 0,
        };
      });

      const existingNames = new Set(realItems.map((r) => r.name.toLowerCase()));
      const remainingDefault = defaultFriends.filter(
        (df) => !existingNames.has(df.name.toLowerCase())
      );
      friendItems = [...realItems, ...remainingDefault];
    }

  const friendsCard = el('div', { className: 'widget-card' });
  const friendsTitle = el('h3', { className: 'widget-title', text: 'รายชื่อเพื่อนทั้งหมด' });
  const friendsList = el('div', { className: 'online-users-list' });

  const renderFriendItem = (user: FriendDisplayItem) => {
    const item = el('div', {
      className: 'online-user-item',
      attrs: {
        style: 'cursor: pointer; padding: 4px 6px; border-radius: 8px; transition: background-color 0.15s;',
        title: `${user.name} - ${user.isOnline ? 'ออนไลน์' : 'ออฟไลน์'}`,
      },
    });

    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f5f0ea';
    });
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });

    const avatarWrap = el('div', { className: 'online-user-avatar-wrap' });
    const userAvatar = el('div', {
      className: 'online-user-avatar',
      attrs: {
        style: 'display:grid; place-items:center; font-weight:700; color:#554c44; font-size:0.85rem;',
      },
      text: user.initial,
    });
    avatarWrap.append(userAvatar);

    // คนที่กำลังออนไลน์ ขึ้นจุดสีเขียว
    if (user.isOnline) {
      const greenDot = el('span', {
        className: 'online-indicator-dot',
        attrs: { title: 'กำลังออนไลน์' },
      });
      avatarWrap.append(greenDot);
    }

    const infoWrap = el('div', {
      attrs: { style: 'display: flex; flex-direction: column; min-width: 0;' },
    });
    const userName = el('span', { className: 'online-user-name', text: user.name });
    const statusText = el('span', {
      attrs: {
        style: `font-size: 0.75rem; font-weight: 500; color: ${user.isOnline ? '#16a34a' : '#8c827a'};`,
      },
      text: user.isOnline ? 'ออนไลน์' : 'ออฟไลน์',
    });

    infoWrap.append(userName, statusText);
    item.append(avatarWrap, infoWrap);
    return item;
  };

  friendItems.forEach((friend) => {
    friendsList.append(renderFriendItem(friend));
  });

  const viewAllWrap = el('div', {
    attrs: { style: 'margin-top: 14px; padding-top: 10px; border-top: 1px solid #ede8e1; text-align: right;' },
  });
  const viewAllLink = el('a', {
    attrs: {
      href: '/connections',
      style: 'font-size: 0.8rem; font-weight: 600; color: #ff5722; text-decoration: none;',
    },
    text: 'จัดการเพื่อนทั้งหมด →',
  });
  viewAllWrap.append(viewAllLink);

  friendsCard.append(friendsTitle, friendsList, viewAllWrap);
  widgets.append(friendsCard);

  container.append(feedMain, widgets);

  return { title: 'ฟีดข่าว', element: container };
}

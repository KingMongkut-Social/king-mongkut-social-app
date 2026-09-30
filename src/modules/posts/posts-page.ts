import { afterLoginPath, requireMember } from '../../core/auth/auth-navigation';
import { authStore } from '../../core/auth/auth-store';
import { realtime } from '../../core/realtime/socket';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { createEmptyState, createErrorState } from '../../core/ui/feedback';
import { toast } from '../../core/ui/toast';
import type { Post } from '../../types/api';
import { listFriends, type AcceptedFriend } from '../friends/friends-api';
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
  let feedError = '';
  const savedOnly = context.query.get('saved') === '1';
  if (savedOnly && authStore.snapshot.status !== 'authenticated') {
    return {
      title: 'บันทึกไว้', element: el('div'),
      redirectTo: '/login?returnTo=' + encodeURIComponent('/?saved=1'),
    };
  }
  if (savedOnly && authStore.snapshot.user?.needsProfileCompletion) {
    return { title: 'บันทึกไว้', element: el('div'), redirectTo: afterLoginPath('/?saved=1') };
  }

  try {
    const result = await (savedOnly
      ? postsApi.listBookmarks({ page, limit: 10, ...(search ? { search } : {}) })
      : postsApi.listPublished({ page, limit: 10, ...(search ? { search } : {}) }));
    posts = result.data.items;
    pages = result.data.pages;
  } catch (error) {
    feedError = errorMessage(error);
  }

  let allFriends: AcceptedFriend[] = [];
  if (authStore.snapshot.status === 'authenticated') {
    try {
      allFriends = await listFriends();
    } catch {
      // The feed remains usable when the friend list is unavailable.
    }
  }

  const container = el('div', { className: 'feed-layout' });

  // --- Left Column: Main Feed ---
  const feedMain = el('div', { className: 'feed-main' });
  feedMain.append(el('h1', { className: 'feed-title', text: savedOnly ? 'บันทึกไว้' : 'ฟีดข่าว' }));

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
      rows: '1',
    },
  });

  topRow.append(avatar, postInput);

  // Extras Bar (Selected feelings & tagged friends)
  let selectedFeeling: FeelingItem | null = null;
  let selectedTaggedFriends: StudentTagItem[] = [];
  let hasSelectedImages = false;
  const updateComposerState = (): void => {
    createBox.classList.toggle('is-expanded', Boolean(postInput.value.trim() || hasSelectedImages || selectedFeeling || selectedTaggedFriends.length));
  };

  const extrasBar = el('div', {
    className: 'create-post-extras-bar',
    attrs: { style: 'display: none;' },
  });

  const renderExtrasBar = () => {
    extrasBar.innerHTML = '';
    if (!selectedFeeling && selectedTaggedFriends.length === 0) {
      extrasBar.style.display = 'none';
      updateComposerState();
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
    updateComposerState();
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
      accept: 'image/jpeg,image/png,image/webp,image/gif',
      multiple: 'true',
      style: 'display: none;',
    },
  });

  const previewContainer = el('div', {
    className: 'create-post-previews-grid',
    attrs: { style: 'display: none;' },
  });

  let currentImages: string[] = [];
  let selectedFiles: File[] = [];

  const renderPreview = (): void => {
    previewContainer.innerHTML = '';
    hasSelectedImages = currentImages.length > 0;
    updateComposerState();
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
        selectedFiles.splice(index, 1);
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
    selectedFiles = [];
    renderPreview();
    fileInput.value = '';
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
    if (selectedFiles.length + files.length > 4) {
      toast.error('แนบรูปภาพได้สูงสุด 4 รูป');
      fileInput.value = '';
      return;
    }
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file) {
          if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
            toast.error(`ไม่รองรับไฟล์ ${file.name}`);
            continue;
          }
          if (file.size > 10 * 1024 * 1024) {
            toast.error(`รูป ${file.name} มีขนาดเกิน 10 MB`);
            continue;
          }
          const dataUrl = await compressImageFile(file);
          currentImages.push(dataUrl);
          selectedFiles.push(file);
        }
      }
      renderPreview();
    } catch (err: unknown) {
      toast.error('ไม่สามารถโหลดรูปภาพได้: ' + errorMessage(err));
    } finally {
      fileInput.value = '';
    }
  });

  attachments.append(photoBtn, tagFriendBtn, feelingWrap, fileInput);

  const cancelBtn = el('button', {
    className: 'button button--ghost composer-cancel-btn',
    text: 'ยกเลิก',
    attrs: { type: 'button' },
  });
  cancelBtn.addEventListener('click', () => {
    postInput.value = '';
    clearSelectedImages();
    selectedFeeling = null;
    selectedTaggedFriends = [];
    renderExtrasBar();
    createBox.classList.remove('is-expanded');
    updateComposerState();
  });

  const postBtn = el('button', {
    className: 'btn-post',
    text: 'โพสต์',
    attrs: { type: 'button' },
  });
  postInput.addEventListener('focus', () => createBox.classList.add('is-expanded'));
  postInput.addEventListener('input', updateComposerState);

  postBtn.addEventListener('click', async () => {
    const text = postInput.value.trim();
    if (!text && currentImages.length === 0) {
      toast.error('กรุณากรอกข้อความหรือเลือกรูปภาพก่อนโพสต์');
      return;
    }
    if (!requireMember()) return;
    postBtn.disabled = true;
    postBtn.textContent = 'กำลังโพสต์…';
    try {
      const postTitle = text ? text.slice(0, 50) : 'รูปภาพ';
      const postContent = text;
      const images = await Promise.all(selectedFiles.map(async (file) => {
        const result = await postsApi.upload(file);
        return result.data.asset.url;
      }));
      await postsApi.create({
        title: postTitle,
        content: postContent,
        status: 'published',
        tags: [authStore.snapshot.user?.university || 'KMITL'],
        coverImage: images[0] ?? null,
        images,
        feeling: selectedFeeling ? `${selectedFeeling.emoji} ${selectedFeeling.label}` : null,
        taggedFriends: selectedTaggedFriends.map((friend) => friend.id),
      });
      clearSelectedImages();
      selectedFeeling = null;
      selectedTaggedFriends = [];
      renderExtrasBar();
      toast.success('เผยแพร่โพสต์เรียบร้อยแล้ว!');
      postInput.value = '';
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    } finally {
      postBtn.disabled = false;
      postBtn.textContent = 'โพสต์';
    }
  });

  const composerActionsRight = el('div', { className: 'composer-actions-right' }, cancelBtn, postBtn);
  actionRow.append(attachments, composerActionsRight);
  createBox.append(topRow, extrasBar, previewContainer, actionRow);

  if (!savedOnly) feedMain.append(createBox);

  // 3. Posts List
  // If there are real posts in DB, render them
  if (feedError) {
    const errorEl = createErrorState({
      message: `ไม่สามารถโหลดโพสต์ได้: ${feedError}`,
      onRetry: () => {
        window.location.reload();
      },
    });
    errorEl.classList.add('feed-state');
    feedMain.append(errorEl);
  } else if (posts.length > 0) {
    posts.forEach((p) => feedMain.append(postCard(p)));
  } else {
    const emptyEl = createEmptyState({
      title: savedOnly ? 'ยังไม่มีโพสต์ที่บันทึกไว้' : search ? 'ไม่พบโพสต์ที่ค้นหา' : 'ยังไม่มีโพสต์ในฟีด',
      description: savedOnly
        ? 'คุณสามารถกดบันทึกโพสต์ที่น่าสนใจเพื่ออ่านภายหลังได้'
        : search
          ? `ไม่พบผลลัพธ์ที่ตรงกับ "${search}" ลองค้นหาด้วยคำอื่น`
          : 'เริ่มแชร์เรื่องราวหรือประสบการณ์ของคุณให้กับชาวสามพระจอมกันเถอะ!',
      actionText: savedOnly ? 'ดูฟีดทั้งหมด' : search ? 'ล้างการค้นหา' : undefined,
      actionHref: savedOnly ? '/' : search ? '/' : undefined,
    });
    emptyEl.classList.add('feed-state');
    feedMain.append(emptyEl);
  }

  const pager = pagination(page, pages, search, '/', savedOnly ? { saved: '1' } : {});
  if (pager) feedMain.append(pager);

  // --- Right Column: Widgets ---
  const widgets = el('div', { className: 'feed-widgets' });

  const friendsCard = el('div', { className: 'widget-card' });
  const friendsTitle = el('h3', { className: 'widget-title', text: 'เพื่อนที่กำลังออนไลน์' });
  const friendsList = el('div', { className: 'online-users-list' });

  const renderFriendItem = (user: AcceptedFriend) => {
    const item = el('a', {
      className: 'online-user-item',
      attrs: {
        href: `/chat?userId=${encodeURIComponent(user.id)}`,
        title: `แชทกับ ${user.name}`,
      },
    });
    const avatarWrap = el('div', { className: 'online-user-avatar-wrap' });
    const userAvatar = el('div', {
      className: 'online-user-avatar',
      text: user.name.charAt(0).toUpperCase(),
    });
    avatarWrap.append(userAvatar);
    const infoWrap = el('div', { className: 'online-user-info' });
    const userName = el('span', { className: 'online-user-name', text: user.name });
    infoWrap.append(userName);
    item.append(avatarWrap, infoWrap, el('span', { className: 'online-indicator-dot', attrs: { title: 'กำลังออนไลน์' } }));
    return item;
  };

  const renderFriends = (): void => {
    friendsList.replaceChildren();
    const online = allFriends.filter((friend) => friend.isOnline);
    online.forEach((friend) => friendsList.append(renderFriendItem(friend)));
    if (online.length === 0) {
      friendsList.append(el('p', { className: 'online-users-empty', text: allFriends.length ? 'ตอนนี้ไม่มีเพื่อนออนไลน์' : 'ยังไม่มีเพื่อนที่ตอบรับแล้ว' }));
    }
  };
  renderFriends();

  let disposed = false;
  const refreshFriends = async (): Promise<void> => {
    if (authStore.snapshot.status !== 'authenticated') return;
    try {
      const latest = await listFriends();
      if (disposed) return;
      allFriends = latest;
      renderFriends();
    } catch {
      // Keep the latest successful list visible while the connection recovers.
    }
  };
  const unsubPresence = realtime.onPresenceUpdated(({ userId, isOnline }) => {
    const friend = allFriends.find((entry) => entry.id === userId);
    if (!friend) return;
    friend.isOnline = isOnline;
    renderFriends();
  });
  const unsubFriends = realtime.onFriendUpdated(() => { void refreshFriends(); });
  const unsubConnection = realtime.onConnection((connected) => {
    if (connected) void refreshFriends();
  });

  const viewAllWrap = el('div', { className: 'online-users-footer' });
  const viewAllLink = el('a', {
    attrs: { href: '/connections' },
    text: 'จัดการเพื่อนทั้งหมด →',
  });
  viewAllWrap.append(viewAllLink);

  friendsCard.append(friendsTitle, friendsList, viewAllWrap);
  widgets.append(friendsCard);

  container.append(feedMain, widgets);

  return {
    title: savedOnly ? 'บันทึกไว้' : 'ฟีดข่าว',
    element: container,
    dispose: () => {
      disposed = true;
      unsubPresence();
      unsubFriends();
      unsubConnection();
    },
  };
}

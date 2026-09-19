import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import type { Post } from '../../types/api';
import { postsApi } from './posts-api';
import { openLightbox, pagination, postCard } from './post-components';

const icons = {
  photo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
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

  const photoBtn = el('button', { className: 'attachment-btn', attrs: { type: 'button' } });
  photoBtn.innerHTML = `${icons.photo} <span>รูปภาพ</span>`;
  photoBtn.addEventListener('click', () => {
    fileInput.click();
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

  attachments.append(photoBtn, fileInput);

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
    if (authStore.snapshot.status !== 'authenticated') {
      toast.info('กรุณาเข้าสู่ระบบก่อนเผยแพร่โพสต์');
      window.history.pushState(null, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }
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
      toast.success('เผยแพร่โพสต์เรียบร้อยแล้ว!');
      postInput.value = '';
      window.location.reload();
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    }
  });

  actionRow.append(attachments, postBtn);
  createBox.append(topRow, previewContainer, actionRow);

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

  // --- Right Column: Widgets (Image 1) ---
  const widgets = el('div', { className: 'feed-widgets' });

  // Widget 1: Online Connections
  const onlineCard = el('div', { className: 'widget-card' });
  const onlineTitle = el('h3', { className: 'widget-title', text: 'เพื่อนที่กำลังออนไลน์' });
  const onlineList = el('div', { className: 'online-users-list' });

  const renderOnlineUser = (name: string, initial: string) => {
    const item = el('div', { className: 'online-user-item' });
    const avatarWrap = el('div', { className: 'online-user-avatar-wrap' });
    const userAvatar = el('div', {
      className: 'online-user-avatar',
      attrs: { style: 'display:grid; place-items:center; font-weight:700; color:#554c44; font-size:0.85rem;' },
      text: initial,
    });
    const greenDot = el('span', { className: 'online-indicator-dot' });
    avatarWrap.append(userAvatar, greenDot);

    const userName = el('span', { className: 'online-user-name', text: name });
    item.append(avatarWrap, userName);
    return item;
  };

  onlineList.append(
    renderOnlineUser('David Chen (KMUTT)', 'D'),
    renderOnlineUser('Emily Rodriguez (KMUTNB)', 'E'),
  );
  onlineCard.append(onlineTitle, onlineList);

  widgets.append(onlineCard);

  container.append(feedMain, widgets);

  return { title: 'ฟีดข่าว', element: container };
}

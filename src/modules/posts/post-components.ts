import { authStore } from '../../core/auth/auth-store';
import { notificationStore } from '../../core/notifications/notification-store';
import { el } from '../../core/ui/dom';
import { toast } from '../../core/ui/toast';
import { authorName, formatDate, formatRelativeTime } from '../../core/utils/format';
import { paginationWindow } from '../../core/utils/pagination';
import type { Post } from '../../types/api';

const postIcons = {
  like: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`,
  comment: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  share: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
};

export function postCard(post: Post, options: { mine?: boolean; isSample?: boolean } = {}): HTMLElement {
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

  const avatar = el('div', {
    className: 'post-avatar',
    attrs: { title: finalAuthorName },
    text: avatarLetter,
  });

  const details = el('div', { className: 'post-author-details' });
  const nameLine = el('div', { className: 'post-author-name-line' });
  const author = el('span', { className: 'post-author-name', text: finalAuthorName });

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
  nameLine.append(author, badge);

  // Department & Major Line (ภาควิชา • คณะวิชา)
  const deptLine = el('div', { className: 'post-dept-line' });
  const deptSpan = el('span', { text: authorDept });
  deptLine.append(deptSpan);
  if (authorFaculty && authorFaculty !== authorDept) {
    const dot = el('span', { className: 'post-dot-sep', text: '•' });
    const facSpan = el('span', { text: authorFaculty });
    deptLine.append(dot, facSpan);
  }

  // Timestamp Line (เวลาที่โพสต์)
  const timestamp = el('div', { className: 'post-timestamp' });
  const timeSpan = el('span', {
    attrs: { title: formatDate(post.createdAt) },
    text: formatRelativeTime(post.createdAt),
  });
  const dotSep = el('span', { className: 'post-dot-sep', text: '•' });
  const typeSpan = el('span', { text: 'อัปเดตโปรเจกต์' });
  timestamp.append(timeSpan, dotSep, typeSpan);

  details.append(nameLine, deptLine, timestamp);
  authorInfo.append(avatar, details);

  const menuBtn = el('button', {
    className: 'post-menu-btn',
    attrs: { type: 'button', 'aria-label': 'ตัวเลือก' },
    text: '•••',
  });

  header.append(authorInfo, menuBtn);
  card.append(header);

  // 2. Post Body Content
  if (post.content && post.content.trim() !== '[รูปภาพ]') {
    const bodyText = el('div', {
      className: 'post-body-text',
      text: post.content,
    });
    card.append(bodyText);
  }

  // 3. Post Media Images (supports 1 image natural ratio or multi-image grid with lightbox zoom)
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
  } else if (imagesList.length === 0 && options.isSample) {
    imagesList = ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80'];
  }

  if (imagesList.length === 1 && imagesList[0]) {
    const singleWrap = el('div', { className: 'post-images-grid post-images-grid--single' });
    const img = el('img', {
      attrs: {
        src: imagesList[0],
        alt: post.title || 'รูปภาพประกอบโปรเจกต์',
        loading: 'lazy',
      },
    });
    img.addEventListener('click', () => {
      openLightbox(imagesList, 0);
    });
    singleWrap.append(img);
    card.append(singleWrap);
  } else if (imagesList.length > 1) {
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
    card.append(grid);
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

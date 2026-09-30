import { requireMember } from '../../core/auth/auth-navigation';
import { authStore } from '../../core/auth/auth-store';
import { notificationStore } from '../../core/notifications/notification-store';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { formatRelativeTime } from '../../core/utils/format';
import type { Post, PostComment } from '../../types/api';
import { postsApi } from './posts-api';

function action(label: string, className = ''): HTMLButtonElement {
  return el('button', { className: `reaction-btn ${className}`.trim(), attrs: { type: 'button' }, text: label });
}

function notifyPostAuthor(post: Post, authorId: string, authorName: string, type: 'like' | 'comment' | 'reply', contentSnippet?: string): void {
  const actor = authStore.snapshot.user;
  if (!actor || !authorId || actor._id === authorId) return;
  notificationStore.addNotification({
    recipientId: authorId,
    recipientName: authorName,
    actorName: actor.name,
    actorInitial: actor.name.charAt(0).toUpperCase(),
    type,
    postId: post._id,
    postSnippet: post.content.slice(0, 40),
    ...(contentSnippet ? { contentSnippet } : {}),
  });
}

export function mountPostSocial(card: HTMLElement, post: Post, authorId: string, authorName: string): void {
  let likesCount = post.likeCount ?? post.likesCount ?? 0;
  let commentsCount = post.commentCount ?? post.commentsCount ?? 0;
  let liked = Boolean(post.likedByMe);
  let saved = Boolean(post.savedByMe);
  let comments: PostComment[] = [];
  let commentsPage = 0;
  let commentsPages = 1;
  let commentsLoaded = false;
  let loadingComments = false;

  const summary = el('div', { className: 'post-social-summary' });
  const reactions = el('div', { className: 'post-reactions-footer' });
  const likeBtn = action('ถูกใจ');
  const commentBtn = action('แสดงความคิดเห็น');
  const shareBtn = action('แชร์');
  const saveBtn = action('บันทึก');
  const commentsSection = el('section', { className: 'post-comments-section', attrs: { hidden: 'true', 'aria-label': 'ความคิดเห็น' } });
  const commentsList = el('div', { className: 'comments-list' });
  const moreBtn = action('ดูความคิดเห็นเพิ่มเติม');
  moreBtn.classList.add('post-comments-more');

  const renderSummary = (): void => {
    summary.replaceChildren();
    summary.append(
      el('span', { className: 'post-social-summary__likes', text: `❤️ ${likesCount}` }),
      el('span', { className: 'post-social-summary__comments', text: `ความคิดเห็น ${commentsCount}` }),
    );
    likeBtn.textContent = liked ? '♥ ถูกใจแล้ว' : 'ถูกใจ';
    likeBtn.classList.toggle('reaction-btn--liked', liked);
    likeBtn.setAttribute('aria-pressed', String(liked));
    saveBtn.textContent = saved ? 'บันทึกแล้ว' : 'บันทึก';
    saveBtn.classList.toggle('reaction-btn--saved', saved);
    saveBtn.setAttribute('aria-pressed', String(saved));
  };
  renderSummary();

  likeBtn.addEventListener('click', async () => {
    if (!requireMember()) return;
    likeBtn.disabled = true;
    try {
      const result = liked ? await postsApi.unlike(post._id) : await postsApi.like(post._id);
      const wasLiked = liked;
      liked = Boolean(result.data.post.likedByMe);
      likesCount = result.data.post.likeCount ?? result.data.post.likesCount ?? Math.max(0, likesCount + (liked ? 1 : -1));
      renderSummary();
      if (!wasLiked && liked) notifyPostAuthor(post, authorId, authorName, 'like');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      likeBtn.disabled = false;
    }
  });

  saveBtn.addEventListener('click', async () => {
    if (!requireMember()) return;
    saveBtn.disabled = true;
    try {
      const result = saved ? await postsApi.unbookmark(post._id) : await postsApi.bookmark(post._id);
      saved = Boolean(result.data.post.savedByMe);
      renderSummary();
      toast.success(saved ? 'บันทึกโพสต์แล้ว' : 'นำโพสต์ออกจากที่บันทึกแล้ว');
      if (!saved && new URLSearchParams(window.location.search).get('saved') === '1') card.remove();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      saveBtn.disabled = false;
    }
  });

  shareBtn.addEventListener('click', async () => {
    const url = new URL(`/posts/${encodeURIComponent(post._id)}`, window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('คัดลอกลิงก์โพสต์แล้ว');
    } catch {
      toast.error('ไม่สามารถคัดลอกลิงก์ได้');
    }
  });

  const makeComment = (comment: PostComment): HTMLElement => {
    const item = el('div', { className: `comment-item ${comment.parentId ? 'comment-item--reply' : ''}` });
    const currentUserId = authStore.snapshot.user?._id;
    const author = comment.author;
    const avatar = el('div', { className: 'comment-avatar', text: author.name.charAt(0).toUpperCase() || 'ส' });
    const bubble = el('div', { className: 'comment-bubble' });
    const header = el('div', { className: 'comment-header' });
    header.append(el('span', { className: 'comment-author-name', text: author.name }));
    if (author.university) header.append(el('span', { className: 'badge-tag badge-tag--tech-uni', text: author.university }));
    bubble.append(header, el('div', { className: 'comment-text', text: comment.content }));
    const footer = el('div', { className: 'comment-footer-actions' });
    footer.append(el('span', { className: 'comment-footer', text: formatRelativeTime(comment.createdAt) }));

    const reply = el('button', { className: 'btn-reply-comment', attrs: { type: 'button' }, text: 'ตอบกลับ' });
    const replyForm = commentForm(comment._id, () => { replyForm.hidden = true; });
    replyForm.hidden = true;
    reply.addEventListener('click', () => {
      if (!requireMember()) return;
      replyForm.hidden = !replyForm.hidden;
      if (!replyForm.hidden) replyForm.querySelector('input')?.focus();
    });
    footer.append(reply);

    if (currentUserId === author._id) {
      const remove = el('button', { className: 'btn-reply-comment', attrs: { type: 'button' }, text: 'ลบ' });
      remove.addEventListener('click', async () => {
        if (!window.confirm('ลบความคิดเห็นนี้?')) return;
        remove.disabled = true;
        try {
          await postsApi.removeComment(post._id, comment._id);
          const response = await postsApi.listComments(post._id, 1, 50);
          comments = response.data.items;
          commentsPage = response.data.page;
          commentsPages = response.data.pages;
          commentsCount = response.data.total;
          renderComments();
          renderSummary();
        } catch (error) {
          toast.error(errorMessage(error));
          remove.disabled = false;
        }
      });
      footer.append(remove);
    }
    bubble.append(footer, replyForm);
    item.append(avatar, bubble);
    return item;
  };

  const renderComments = (): void => {
    commentsList.replaceChildren();
    if (comments.length === 0) {
      commentsList.append(el('p', { className: 'comments-empty', text: 'ยังไม่มีความคิดเห็น' }));
    } else {
      const byParent = new Map<string, PostComment[]>();
      for (const comment of comments) {
        if (!comment.parentId) continue;
        const siblings = byParent.get(comment.parentId) ?? [];
        siblings.push(comment);
        byParent.set(comment.parentId, siblings);
      }
      const knownIds = new Set(comments.map((comment) => comment._id));
      const appendReplies = (parentId: string, thread: HTMLElement, seen: Set<string>): void => {
        for (const child of byParent.get(parentId) ?? []) {
          if (seen.has(child._id)) continue;
          seen.add(child._id);
          thread.append(makeComment(child));
          appendReplies(child._id, thread, seen);
        }
      };
      for (const comment of comments) {
        if (comment.parentId && knownIds.has(comment.parentId)) continue;
        const thread = el('div', { className: 'comment-thread-block' });
        thread.append(makeComment(comment));
        appendReplies(comment._id, thread, new Set([comment._id]));
        commentsList.append(thread);
      }
    }
    moreBtn.hidden = commentsPage >= commentsPages;
  };

  function commentForm(parentId?: string, onSent?: () => void): HTMLFormElement {
    const form = el('form', { className: parentId ? 'comment-reply-form' : 'comment-input-form' });
    const user = authStore.snapshot.user;
    form.append(el('div', { className: 'comment-avatar', text: user?.name.charAt(0).toUpperCase() || 'ส' }));
    const wrap = el('div', { className: 'comment-input-wrap' });
    const input = el('input', {
      className: 'comment-input-field',
      attrs: { type: 'text', placeholder: parentId ? 'เขียนคำตอบ…' : 'เขียนความคิดเห็น…', maxlength: '2000', required: 'true' },
    });
    const send = el('button', { className: 'btn-send-comment', attrs: { type: 'submit' }, text: 'ส่ง' });
    wrap.append(input, send);
    form.append(wrap);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!requireMember()) return;
      const content = input.value.trim();
      if (!content) return;
      send.disabled = true;
      try {
        const response = await postsApi.addComment(post._id, content, parentId);
        const comment = response.data.comment;
        comments.push(comment);
        commentsCount += 1;
        input.value = '';
        renderComments();
        renderSummary();
        notifyPostAuthor(post, authorId, authorName, parentId ? 'reply' : 'comment', content);
        onSent?.();
      } catch (error) {
        toast.error(errorMessage(error));
      } finally {
        send.disabled = false;
      }
    });
    return form;
  }

  const loadComments = async (): Promise<void> => {
    if (loadingComments || commentsPage >= commentsPages) return;
    loadingComments = true;
    moreBtn.disabled = true;
    try {
      const response = await postsApi.listComments(post._id, commentsPage + 1, 50);
      comments.push(...response.data.items);
      commentsPage = response.data.page;
      commentsPages = response.data.pages;
      commentsCount = response.data.total;
      commentsLoaded = true;
      renderComments();
      renderSummary();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      loadingComments = false;
      moreBtn.disabled = false;
    }
  };

  commentBtn.addEventListener('click', () => {
    commentsSection.hidden = !commentsSection.hidden;
    commentBtn.classList.toggle('reaction-btn--active-comment', !commentsSection.hidden);
    if (!commentsSection.hidden) {
      if (!commentsLoaded) void loadComments();
      commentsSection.querySelector<HTMLInputElement>('.comment-input-form input')?.focus();
    }
  });
  moreBtn.addEventListener('click', () => void loadComments());
  commentsSection.append(commentsList, moreBtn, commentForm());
  renderComments();
  reactions.append(likeBtn, commentBtn, shareBtn, saveBtn);
  card.append(summary, reactions, commentsSection);
}

import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { relativeDate } from '../../core/utils/format';
import type { Comment, Engagement, PostAuthor, ReactionType } from '../../types/api';
import { socialPostCard } from './post-components';
import { postsApi } from './posts-api';

const reactions: Array<{ type: ReactionType; emoji: string }> = [
  { type: 'like', emoji: '👍' },
  { type: 'love', emoji: '❤️' },
  { type: 'haha', emoji: '😂' },
  { type: 'wow', emoji: '😮' },
  { type: 'sad', emoji: '😢' },
  { type: 'angry', emoji: '😡' },
];

function commentAvatar(author: PostAuthor): HTMLElement {
  const avatar = el('span', { className: 'avatar avatar--comment' });
  if (author.avatarUrl) avatar.append(el('img', { attrs: { src: author.avatarUrl, alt: '' } }));
  else avatar.textContent = author.name.charAt(0).toUpperCase() || '?';
  return avatar;
}

function canModify(comment: Comment): boolean {
  const user = authStore.snapshot.user;
  return Boolean(user && (user.role === 'admin' || user._id === comment.author._id));
}

function commentReactionBar(comment: Comment): HTMLElement {
  const engagement: Engagement = comment.engagement;
  const bar = el('div', { className: 'comment-reactions' });

  const render = (): void => {
    bar.replaceChildren();
    for (const reaction of reactions) {
      const active = engagement.viewerReaction === reaction.type;
      const button = el('button', {
        className: active ? 'is-active' : '',
        text: `${reaction.emoji}${engagement.counts[reaction.type] ? ` ${engagement.counts[reaction.type]}` : ''}`,
        attrs: { type: 'button', 'aria-pressed': String(active) },
      });
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const result = active
            ? await postsApi.removeReaction('comment', comment._id)
            : await postsApi.react('comment', comment._id, reaction.type);
          Object.assign(engagement, result.data.engagement);
          render();
        } catch (cause) {
          toast.error(errorMessage(cause));
          button.disabled = false;
        }
      });
      bar.append(button);
    }
  };

  render();
  return bar;
}

function replyComposer(postId: string, parentCommentId: string, onDone: () => void): HTMLElement {
  const form = el('form', { className: 'reply-composer' });
  const input = el('textarea', {
    className: 'input',
    attrs: { rows: '2', maxlength: '5000', placeholder: 'Write a reply…', required: 'true' },
  });
  const submit = el('button', { className: 'button button--primary button--small', text: 'Reply', attrs: { type: 'submit' } });
  form.append(input, submit);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const content = input.value.trim();
    if (!content) return;
    submit.disabled = true;
    try {
      await postsApi.createComment(postId, content, parentCommentId);
      onDone();
    } catch (cause) {
      toast.error(errorMessage(cause));
      submit.disabled = false;
    }
  });
  return form;
}

function renderCommentTree(postId: string, comments: Comment[], reload: () => void): HTMLElement {
  const byParent = new Map<string | null, Comment[]>();
  for (const comment of comments) {
    const key = comment.parentCommentId;
    const list = byParent.get(key) ?? [];
    list.push(comment);
    byParent.set(key, list);
  }

  const renderComment = (comment: Comment, depth: number): HTMLElement => {
    const wrapper = el('article', { className: 'comment' });
    wrapper.style.setProperty('--comment-depth', String(Math.min(depth, 6)));

    const header = el('div', { className: 'comment__header' },
      commentAvatar(comment.author),
      el('div', {},
        el('div', { className: 'comment__name-row' },
          el('strong', { text: comment.author.name }),
          comment.author.university
            ? el('span', { className: `university-badge university-badge--${comment.author.university.toLowerCase()}`, text: comment.author.university })
            : el('span'),
        ),
        el('span', { className: 'comment__time', text: relativeDate(comment.createdAt) }),
      ),
    );

    const body = el('div', {
      className: `comment__body${comment.isDeleted ? ' is-deleted' : ''}`,
      text: comment.isDeleted ? 'Comment deleted' : comment.content,
    });
    wrapper.append(header, body);

    if (!comment.isDeleted) {
      const actions = el('div', { className: 'comment__actions' }, commentReactionBar(comment));
      const replyButton = el('button', { className: 'text-button', text: 'Reply', attrs: { type: 'button' } });
      actions.append(replyButton);

      if (canModify(comment)) {
        const deleteButton = el('button', { className: 'text-button text-button--danger', text: 'Delete', attrs: { type: 'button' } });
        deleteButton.addEventListener('click', async () => {
          if (!window.confirm('Delete this comment? Replies will remain visible.')) return;
          deleteButton.disabled = true;
          try {
            await postsApi.removeComment(postId, comment._id);
            reload();
          } catch (cause) {
            toast.error(errorMessage(cause));
            deleteButton.disabled = false;
          }
        });
        actions.append(deleteButton);
      }

      const replySlot = el('div');
      replyButton.addEventListener('click', () => {
        if (replySlot.childElementCount) {
          replySlot.replaceChildren();
          return;
        }
        replySlot.append(replyComposer(postId, comment._id, reload));
      });

      wrapper.append(actions, replySlot);
    }

    const children = byParent.get(comment._id) ?? [];
    if (children.length) {
      const nested = el('div', { className: 'comment-children' });
      for (const child of children) nested.append(renderComment(child, depth + 1));
      wrapper.append(nested);
    }
    return wrapper;
  };

  const root = el('div', { className: 'comments-tree' });
  for (const comment of byParent.get(null) ?? []) root.append(renderComment(comment, 0));
  return root;
}

export async function postDetailPage(context: RouteContext): Promise<PageView> {
  const id = context.params.id;
  if (!id) throw new Error('Post id is missing');

  const [postResult, commentsResult] = await Promise.all([
    postsApi.getById(id),
    postsApi.listComments(id),
  ]);
  const post = postResult.data.post;

  const page = el('section', { className: 'detail-page' });
  const back = el('a', { className: 'detail-back', text: '← Back to feed', attrs: { href: '/' } });
  page.append(back, socialPostCard(post, { detail: true }));

  const commentsSection = el('section', { className: 'comments-section', attrs: { id: 'comments' } },
    el('h2', { text: `Comments (${commentsResult.data.items.length})` }),
  );

  const reload = (): void => window.dispatchEvent(new PopStateEvent('popstate'));
  const form = el('form', { className: 'comment-composer' });
  const textarea = el('textarea', {
    className: 'input',
    attrs: { rows: '3', maxlength: '5000', placeholder: 'Write a comment…', required: 'true' },
  });
  const submit = el('button', { className: 'button button--primary', text: 'Comment', attrs: { type: 'submit' } });
  form.append(textarea, submit);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const content = textarea.value.trim();
    if (!content) return;
    submit.disabled = true;
    try {
      await postsApi.createComment(id, content);
      reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
      submit.disabled = false;
    }
  });

  commentsSection.append(form);
  if (commentsResult.data.items.length) {
    commentsSection.append(renderCommentTree(id, commentsResult.data.items, reload));
  } else {
    commentsSection.append(el('p', { className: 'muted comments-empty', text: 'No comments yet. Start the conversation.' }));
  }

  page.append(commentsSection);
  return { title: post.title, element: page };
}

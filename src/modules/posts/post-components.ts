import { authStore } from '../../core/auth/auth-store';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { authorName, excerpt, formatDate, relativeDate } from '../../core/utils/format';
import { paginationWindow } from '../../core/utils/pagination';
import type { Engagement, Post, PostAuthor, ReactionType } from '../../types/api';
import { postsApi } from './posts-api';

const reactions: Array<{ type: ReactionType; emoji: string; label: string }> = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'haha', emoji: '😂', label: 'Haha' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😡', label: 'Angry' },
];

function authorObject(author: string | PostAuthor): PostAuthor | null {
  return typeof author === 'string' ? null : author;
}

function avatar(author: string | PostAuthor): HTMLElement {
  const data = authorObject(author);
  const wrapper = el('span', { className: 'avatar' });
  if (data?.avatarUrl) {
    wrapper.append(el('img', { attrs: { src: data.avatarUrl, alt: '' } }));
  } else {
    wrapper.textContent = authorName(author).charAt(0).toUpperCase() || '?';
  }
  return wrapper;
}

function emptyEngagement(): Engagement {
  return {
    total: 0,
    counts: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
    viewerReaction: null,
    commentCount: 0,
  };
}

function reactionSummary(engagement: Engagement): string {
  return reactions
    .filter(({ type }) => engagement.counts[type] > 0)
    .sort((a, b) => engagement.counts[b.type] - engagement.counts[a.type])
    .slice(0, 3)
    .map(({ emoji }) => emoji)
    .join('');
}

function reactionControls(post: Post, engagement: Engagement): HTMLElement {
  const wrapper = el('div', { className: 'reaction-area' });
  const summary = el('div', { className: 'engagement-summary' });
  const controls = el('div', { className: 'reaction-controls' });

  const render = (): void => {
    summary.replaceChildren();
    const icons = reactionSummary(engagement);
    summary.append(
      el('span', { text: icons || '♡' }),
      el('span', { text: String(engagement.total) }),
      el('a', {
        text: `${engagement.commentCount ?? 0} comments`,
        attrs: { href: `/posts/${post._id}#comments` },
      }),
    );

    controls.replaceChildren();
    for (const reaction of reactions) {
      const active = engagement.viewerReaction === reaction.type;
      const button = el('button', {
        className: `reaction-button${active ? ' is-active' : ''}`,
        attrs: {
          type: 'button',
          title: reaction.label,
          'aria-label': reaction.label,
          'aria-pressed': String(active),
        },
      }, el('span', { text: reaction.emoji }));

      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const result = active
            ? await postsApi.removeReaction('post', post._id)
            : await postsApi.react('post', post._id, reaction.type);
          Object.assign(engagement, result.data.engagement);
          render();
        } catch (cause) {
          toast.error(errorMessage(cause));
          button.disabled = false;
        }
      });
      controls.append(button);
    }
    controls.append(el('a', {
      className: 'comment-action',
      text: '▢ Comment',
      attrs: { href: `/posts/${post._id}#comments` },
    }));
  };

  render();
  wrapper.append(summary, controls);
  return wrapper;
}

function canEdit(author: string | PostAuthor): boolean {
  const user = authStore.snapshot.user;
  if (!user) return false;
  if (user.role === 'admin') return true;
  return (typeof author === 'string' ? author : author._id) === user._id;
}

export function socialPostCard(post: Post, options: { detail?: boolean } = {}): HTMLElement {
  const author = authorObject(post.author);
  const article = el('article', { className: `social-post${options.detail ? ' social-post--detail' : ''}` });

  const heading = el('div', { className: 'social-post__heading' },
    avatar(post.author),
    el('div', { className: 'social-post__identity' },
      el('div', { className: 'social-post__name-row' },
        el('strong', { text: authorName(post.author) }),
        author?.university
          ? el('span', { className: `university-badge university-badge--${author.university.toLowerCase()}`, text: author.university })
          : el('span'),
      ),
      el('span', { className: 'social-post__time', text: relativeDate(post.publishedAt ?? post.createdAt) }),
    ),
  );

  if (canEdit(post.author)) {
    heading.append(el('a', {
      className: 'post-menu',
      text: '•••',
      attrs: { href: `/dashboard/posts/${post._id}/edit`, title: 'Edit post' },
    }));
  }

  article.append(heading, el('div', { className: 'social-post__content', text: post.content }));

  if (post.coverImage) {
    article.append(el('img', {
      className: 'social-post__image',
      attrs: { src: post.coverImage, alt: 'Post attachment', loading: 'lazy' },
    }));
  }

  article.append(reactionControls(post, post.engagement ?? emptyEngagement()));
  return article;
}

export function postCard(post: Post, options: { mine?: boolean } = {}): HTMLElement {
  if (!options.mine) return socialPostCard(post);

  const article = el('article', { className: 'post-card' });
  const meta = el('div', { className: 'post-card__meta' },
    el('span', { className: `badge badge--${post.status}`, text: post.status }),
    el('span', { text: formatDate(post.createdAt) }),
  );

  article.append(
    meta,
    el('h2', { className: 'post-card__title' },
      el('a', { text: post.title, attrs: { href: `/posts/${post._id}` } })),
    el('p', { className: 'post-card__excerpt', text: excerpt(post.content) }),
    el('div', { className: 'post-card__footer' },
      el('span', { className: 'muted', text: `Updated ${formatDate(post.updatedAt)}` }),
      el('a', { className: 'text-link', text: 'Edit →', attrs: { href: `/dashboard/posts/${post._id}/edit` } }),
    ),
  );
  return article;
}

export function pagination(current: number, total: number, search: string, basePath: string): HTMLElement | null {
  if (total <= 1) return null;

  const nav = el('nav', { className: 'pagination', attrs: { 'aria-label': 'Pagination' } });
  const buildHref = (page: number): string => {
    const query = new URLSearchParams();
    query.set('page', String(page));
    if (search) query.set('search', search);
    return `${basePath}?${query.toString()}`;
  };

  if (current > 1) nav.append(el('a', { className: 'pagination__link', text: '← Prev', attrs: { href: buildHref(current - 1) } }));
  for (const page of paginationWindow(current, total)) {
    nav.append(page === current
      ? el('span', { className: 'pagination__link is-current', text: String(page), attrs: { 'aria-current': 'page' } })
      : el('a', { className: 'pagination__link', text: String(page), attrs: { href: buildHref(page) } }));
  }
  if (current < total) nav.append(el('a', { className: 'pagination__link', text: 'Next →', attrs: { href: buildHref(current + 1) } }));
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
      placeholder: 'Search posts…',
      maxlength: '100',
      'aria-label': 'Search posts',
    },
  });
  form.append(input, el('button', { className: 'button button--secondary', text: 'Search', attrs: { type: 'submit' } }));
  return form;
}

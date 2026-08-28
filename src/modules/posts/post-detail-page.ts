import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { authorName, formatDate } from '../../core/utils/format';
import { postsApi } from './posts-api';

function canEdit(author: string | { _id: string; name: string }): boolean {
  const user = authStore.snapshot.user;
  if (!user) return false;
  if (user.role === 'admin') return true;
  const authorId = typeof author === 'string' ? author : author._id;
  return authorId === user._id;
}

export async function postDetailPage(context: RouteContext): Promise<PageView> {
  const id = context.params.id;
  if (!id) throw new Error('Post id is missing');
  const result = await postsApi.getById(id);
  const post = result.data.post;

  const section = el('article', { className: 'article page-shell page-shell--narrow' });
  const meta = el('div', { className: 'article__meta' });
  meta.append(
    el('span', { className: `badge badge--${post.status}`, text: post.status }),
    el('span', { text: `By ${authorName(post.author)}` }),
    el('span', { text: formatDate(post.createdAt) }),
  );

  const actions = el('div', { className: 'article__actions' },
    el('a', { className: 'text-link', text: '← Back to posts', attrs: { href: '/' } }),
  );
  if (canEdit(post.author)) {
    actions.append(el('a', { className: 'button button--small button--secondary', text: 'Edit post', attrs: { href: `/dashboard/posts/${post._id}/edit` } }));
  }

  section.append(
    actions,
    meta,
    el('h1', { className: 'article__title', text: post.title }),
    el('div', { className: 'article__content', text: post.content }),
    el('p', { className: 'article__updated muted', text: `Last updated ${formatDate(post.updatedAt)}` }),
  );
  return { title: post.title, element: section };
}

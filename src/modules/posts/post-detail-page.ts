import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { authorName, formatDate } from '../../core/utils/format';
import { postsApi } from './posts-api';

function canEdit(author: unknown): boolean {
  const user = authStore.snapshot.user;
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!author) return false;
  const authorId = typeof author === 'string' ? author : (author as { _id?: string })._id;
  return authorId === user._id;
}

export async function postDetailPage(context: RouteContext): Promise<PageView> {
  const id = context.params.id;
  if (!id) throw new Error('Post id is missing');
  const result = await postsApi.getById(id);
  const post = result.data.post;
  const authorData = post.user || post.author;

  const section = el('article', { className: 'article page-shell page-shell--narrow' });
  const meta = el('div', { className: 'article__meta' });
  meta.append(
    el('span', { className: `badge badge--${post.status}`, text: post.status === 'published' ? 'เผยแพร่แล้ว' : 'แบบร่าง' }),
    el('span', { text: `โดย ${authorName(authorData)}` }),
    el('span', { text: formatDate(post.createdAt) }),
  );

  const actions = el('div', { className: 'article__actions' },
    el('a', { className: 'text-link', text: '← กลับไปยังฟีดโพสต์', attrs: { href: '/' } }),
  );
  if (canEdit(authorData)) {
    actions.append(el('a', { className: 'button button--small button--secondary', text: 'แก้ไขโพสต์', attrs: { href: `/dashboard/posts/${post._id}/edit` } }));
  }

  section.append(
    actions,
    meta,
    el('h1', { className: 'article__title', text: post.title }),
    el('div', { className: 'article__content', text: post.content }),
    el('p', { className: 'article__updated muted', text: `อัปเดตล่าสุดเมื่อ ${formatDate(post.updatedAt)}` }),
  );
  return { title: post.title, element: section };
}

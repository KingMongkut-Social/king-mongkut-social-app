import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { reactIcon } from '../../core/ui/react-icon';
import { authorName, formatDate } from '../../core/utils/format';
import { getPostImages, postCard, renderPostImagesGrid } from './post-components';
import { assetUrl, postsApi } from './posts-api';

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

  const section = el('section', { className: 'page-shell page-shell--narrow post-detail-page' });

  const actions = el('div', { className: 'article__actions', attrs: { style: 'display: flex; align-items: center; gap: 12px; flex-wrap: wrap;' } },
    el('a', { className: 'text-link', text: '← กลับไปยังฟีดโพสต์', attrs: { href: '/' } }),
  );
  if (canEdit(authorData)) {
    actions.append(el('a', { className: 'button button--small button--secondary', text: 'แก้ไขโพสต์', attrs: { href: `/dashboard/posts/${post._id}/edit` } }));
  }

  section.append(actions);
  if (post.status === 'published') {
    section.append(postCard(post));
  } else {
    const draft = el('article', { className: 'article' });
    draft.append(
      el('div', { className: 'article__meta' },
        el('span', { className: 'badge badge--draft', text: 'แบบร่าง' }),
        el('span', { text: `โดย ${authorName(authorData)}` }),
        el('span', { text: formatDate(post.createdAt) }),
      ),
      el('h1', { className: 'article__title', text: post.title }),
      el('div', { className: 'article__content', text: post.content }),
    );
    const media = renderPostImagesGrid(getPostImages(post), post.title);
    if (media) draft.append(media);
    for (const attachment of post.attachments ?? []) {
      const attachmentLink = el('a', {
        className: 'text-link',
        attrs: { href: assetUrl(attachment.url), target: '_blank', rel: 'noopener noreferrer' },
      });
      attachmentLink.append(reactIcon('paperclip'), document.createTextNode(` ${attachment.name}`));
      draft.append(attachmentLink);
    }
    draft.append(el('p', { className: 'article__updated muted', text: `อัปเดตล่าสุดเมื่อ ${formatDate(post.updatedAt)}` }));
    section.append(draft);
  }
  return { title: post.title, element: section };
}

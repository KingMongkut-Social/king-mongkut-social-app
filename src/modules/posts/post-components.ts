import { el } from '../../core/ui/dom';
import { authorName, excerpt, formatDate } from '../../core/utils/format';
import { paginationWindow } from '../../core/utils/pagination';
import type { Post } from '../../types/api';

export function postCard(post: Post, options: { mine?: boolean } = {}): HTMLElement {
  const article = el('article', { className: 'post-card' });
  const meta = el('div', { className: 'post-card__meta' });
  meta.append(
    el('span', { className: `badge badge--${post.status}`, text: post.status }),
    el('span', { text: formatDate(post.createdAt) }),
  );

  const title = el('h2', { className: 'post-card__title' },
    el('a', { text: post.title, attrs: { href: `/posts/${post._id}` } }),
  );
  const summary = el('p', { className: 'post-card__excerpt', text: excerpt(post.content) });
  const footer = el('div', { className: 'post-card__footer' });
  footer.append(el('span', { className: 'muted', text: options.mine ? `Updated ${formatDate(post.updatedAt)}` : `By ${authorName(post.author)}` }));

  if (options.mine) {
    footer.append(el('a', { className: 'text-link', text: 'Edit →', attrs: { href: `/dashboard/posts/${post._id}/edit` } }));
  } else {
    footer.append(el('a', { className: 'text-link', text: 'Read →', attrs: { href: `/posts/${post._id}` } }));
  }

  article.append(meta, title, summary, footer);
  return article;
}

export function pagination(
  current: number,
  total: number,
  search: string,
  basePath: string,
): HTMLElement | null {
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
    if (page === current) {
      nav.append(el('span', { className: 'pagination__link is-current', text: String(page), attrs: { 'aria-current': 'page' } }));
    } else {
      nav.append(el('a', { className: 'pagination__link', text: String(page), attrs: { href: buildHref(page) } }));
    }
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

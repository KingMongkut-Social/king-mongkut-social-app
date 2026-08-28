import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { postsApi } from './posts-api';
import { pagination, postCard, searchForm } from './post-components';

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function postsPage(context: RouteContext): Promise<PageView> {
  const page = positiveInteger(context.query.get('page'), 1);
  const search = (context.query.get('search') ?? '').trim().slice(0, 100);
  const result = await postsApi.listPublished({ page, limit: 12, ...(search ? { search } : {}) });

  const section = el('section', { className: 'page-shell' });
  const hero = el('div', { className: 'hero' });
  hero.append(
    el('p', { className: 'eyebrow', text: 'King Mongkut Social' }),
    el('h1', { text: 'King Mongkut Social' }),
    el('p', { className: 'hero__lead', text: 'Browse public posts, or sign in to create drafts and share your ideas.' }),
  );
  const searchBar = searchForm(search, '/');
  const summary = el('div', { className: 'section-heading' },
    el('div', {},
      el('h2', { text: search ? `Results for “${search}”` : 'Latest posts' }),
      el('p', { className: 'muted', text: `${result.data.total} ${result.data.total === 1 ? 'post' : 'posts'}` }),
    ),
  );

  const grid = el('div', { className: 'post-grid' });
  if (result.data.items.length === 0) {
    grid.append(el('div', { className: 'empty-state empty-state--compact' },
      el('h3', { text: 'No posts found' }),
      el('p', { className: 'muted', text: search ? 'Try a different search term.' : 'Published posts will appear here.' }),
    ));
  } else {
    grid.append(...result.data.items.map((post) => postCard(post)));
  }

  section.append(hero, searchBar, summary, grid);
  const pager = pagination(result.data.page, result.data.pages, search, '/');
  if (pager) section.append(pager);
  return { title: 'Posts', element: section };
}

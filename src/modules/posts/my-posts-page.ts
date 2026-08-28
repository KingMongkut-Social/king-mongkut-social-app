import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { pagination, postCard, searchForm } from './post-components';
import { postsApi } from './posts-api';

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function myPostsPage(context: RouteContext): Promise<PageView> {
  const page = positiveInteger(context.query.get('page'), 1);
  const search = (context.query.get('search') ?? '').trim().slice(0, 100);
  const result = await postsApi.listMine({ page, limit: 12, ...(search ? { search } : {}) });

  const section = el('section', { className: 'page-shell' });
  const heading = el('div', { className: 'dashboard-heading' },
    el('div', {},
      el('p', { className: 'eyebrow', text: 'Dashboard' }),
      el('h1', { text: 'My posts' }),
      el('p', { className: 'muted', text: 'Manage both drafts and published posts from one place.' }),
    ),
    el('a', { className: 'button button--primary', text: '+ New post', attrs: { href: '/dashboard/posts/new' } }),
  );

  const searchBar = searchForm(search, '/dashboard');
  const grid = el('div', { className: 'post-grid' });

  if (result.data.items.length === 0) {
    grid.append(el('div', { className: 'empty-state empty-state--compact' },
      el('h3', { text: search ? 'No matching posts' : 'You have not written anything yet' }),
      el('p', { className: 'muted', text: search ? 'Try another search.' : 'Create a draft and publish it when you are ready.' }),
      el('a', { className: 'button button--primary', text: 'Create your first post', attrs: { href: '/dashboard/posts/new' } }),
    ));
  } else {
    for (const post of result.data.items) {
      const wrapper = el('div', { className: 'dashboard-post' });
      wrapper.append(postCard(post, { mine: true }));
      const deleteButton = el('button', { className: 'danger-link', text: 'Delete', attrs: { type: 'button' } });
      deleteButton.addEventListener('click', async () => {
        const confirmed = window.confirm(`Delete “${post.title}”? This cannot be undone.`);
        if (!confirmed) return;
        deleteButton.disabled = true;
        try {
          await postsApi.remove(post._id);
          toast.success('Post deleted');
          wrapper.remove();
          if (!grid.querySelector('.dashboard-post')) {
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        } catch (error) {
          toast.error(errorMessage(error));
          deleteButton.disabled = false;
        }
      });
      wrapper.append(el('div', { className: 'dashboard-post__danger' }, deleteButton));
      grid.append(wrapper);
    }
  }

  section.append(heading, searchBar, grid);
  const pager = pagination(result.data.page, result.data.pages, search, '/dashboard');
  if (pager) section.append(pager);
  return { title: 'My posts', element: section };
}

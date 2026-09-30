import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
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
      el('p', { className: 'eyebrow', text: 'แดชบอร์ด' }),
      el('h1', { text: 'โพสต์ของฉัน' }),
      el('p', { className: 'muted', text: 'จัดการแบบร่างและโพสต์ที่เผยแพร่ทั้งหมดของคุณ' }),
    ),
    el('a', { className: 'button button--primary', text: '+ สร้างโพสต์ใหม่', attrs: { href: '/dashboard/posts/new' } }),
  );

  const searchBar = searchForm(search, '/dashboard');
  const grid = el('div', { className: 'post-grid' });

  if (result.data.items.length === 0) {
    grid.append(el('div', { className: 'empty-state empty-state--compact' },
      el('h3', { text: search ? 'ไม่พบโพสต์ที่ค้นหา' : 'คุณยังไม่มีโพสต์ที่เขียน' }),
      el('p', { className: 'muted', text: search ? 'ลองค้นหาด้วยคำอื่น' : 'สร้างแบบร่างและเผยแพร่ผลงานของคุณเมื่อพร้อม' }),
      el('a', { className: 'button button--primary', text: 'สร้างโพสต์แรกของคุณ', attrs: { href: '/dashboard/posts/new' } }),
    ));
  } else {
    for (const post of result.data.items) {
      // Owner edit/delete actions already live inside PostCard's accessible overflow menu.
      // Keep dashboard management actions attached to the card so destructive controls
      // can never float outside the post surface.
      grid.append(postCard(post, { mine: true }));
    }
  }

  section.append(heading, searchBar, grid);
  const pager = pagination(result.data.page, result.data.pages, search, '/dashboard');
  if (pager) section.append(pager);
  return { title: 'โพสต์ของฉัน', element: section };
}

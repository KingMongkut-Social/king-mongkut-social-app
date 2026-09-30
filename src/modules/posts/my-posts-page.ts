import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { confirmAction } from '../../core/ui/confirm-dialog';
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
      const wrapper = el('div', { className: 'dashboard-post' });
      wrapper.append(postCard(post, { mine: true }));
      const deleteButton = el('button', { className: 'danger-link', text: 'ลบโพสต์', attrs: { type: 'button' } });
      deleteButton.addEventListener('click', async () => {
        const confirmed = await confirmAction({
          title: 'ยืนยันการลบโพสต์',
          message: `ต้องการลบโพสต์ “${post.title}” ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
          confirmText: 'ลบโพสต์',
          danger: true,
        });
        if (!confirmed) return;
        deleteButton.disabled = true;
        try {
          await postsApi.remove(post._id);
          toast.success('ลบโพสต์เรียบร้อย');
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
  return { title: 'โพสต์ของฉัน', element: section };
}

import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { groupsApi } from './groups-api';

export async function groupsPage(context: RouteContext): Promise<PageView> {
  const q = context.query.get('q')?.trim() ?? '';
  const root = el('section', { className: 'platform-page groups-page' });
  const header = el('div', { className: 'platform-heading-row' });
  header.append(
    el('div', {}, el('p', { className: 'eyebrow', text: 'Community' }), el('h1', { className: 'platform-title', text: 'กลุ่ม' })),
  );

  if (authStore.snapshot.status === 'authenticated') {
    const createButton = el('button', { className: 'button button--primary', text: '+ สร้างกลุ่ม', attrs: { type: 'button' } });
    createButton.addEventListener('click', async () => {
      const name = window.prompt('ชื่อกลุ่ม');
      if (!name?.trim()) return;
      const description = window.prompt('รายละเอียดกลุ่ม', '') ?? '';
      try {
        const group = await groupsApi.create({
          name: name.trim(),
          description,
          privacy: 'public',
          university: authStore.snapshot.user?.university ?? null,
        });
        window.history.pushState(null, '', `/groups/${group.id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
    header.append(createButton);
  }
  root.append(header);

  const search = el('form', { className: 'platform-search' });
  const input = el('input', { attrs: { type: 'search', name: 'q', value: q, placeholder: 'ค้นหากลุ่ม...' } });
  search.append(input, el('button', { className: 'button button--secondary', text: 'ค้นหา', attrs: { type: 'submit' } }));
  search.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim();
    window.history.pushState(null, '', value ? `/groups?q=${encodeURIComponent(value)}` : '/groups');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  root.append(search);

  const grid = el('div', { className: 'platform-card-grid' });
  root.append(grid);
  try {
    const result = await groupsApi.list(q);
    if (!result.items.length) grid.append(el('div', { className: 'platform-state', text: 'ยังไม่มีกลุ่มที่ตรงกับการค้นหา' }));
    for (const group of result.items) {
      grid.append(el('a', { className: 'platform-card group-card', attrs: { href: `/groups/${group.id}` } },
        el('div', { className: 'group-card__cover' }),
        el('h2', { text: group.name }),
        el('p', { text: group.description || 'ชุมชนสำหรับแลกเปลี่ยนและพูดคุย' }),
        el('div', { className: 'platform-meta', text: `${group.memberCount} สมาชิก${group.university ? ` · ${group.university}` : ''}` }),
      ));
    }
  } catch (error) {
    grid.append(el('div', { className: 'platform-state platform-state--error', text: errorMessage(error) }));
  }
  return { title: 'กลุ่ม', element: root };
}

import type { PageView } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { universitiesApi } from './universities-api';

export async function universitiesPage(): Promise<PageView> {
  const root = el('section', { className: 'platform-page universities-page' });
  root.append(
    el('p', { className: 'eyebrow', text: '3 พระจอมฯ' }),
    el('h1', { className: 'platform-title', text: 'สถาบัน' }),
    el('p', { className: 'platform-lead', text: 'สำรวจชุมชนนักศึกษาจากทั้ง 3 มหาวิทยาลัยพระจอมเกล้า' }),
  );
  const grid = el('div', { className: 'platform-card-grid' });
  root.append(grid);

  try {
    const items = await universitiesApi.list();
    for (const university of items) {
      const card = el('a', {
        className: `platform-card university-card university-card--${university.code.toLowerCase()}`,
        attrs: { href: `/universities/${university.code}` },
      });
      card.append(
        el('div', { className: 'university-card__logo', text: university.code }),
        el('h2', { text: university.shortName }),
        el('p', { text: university.name }),
        el('div', {
          className: 'platform-meta',
          text: `${university.memberCount.toLocaleString()} สมาชิก · ${university.postCount.toLocaleString()} โพสต์`,
        }),
      );
      grid.append(card);
    }
  } catch (error) {
    grid.append(el('div', { className: 'platform-state', text: `โหลดข้อมูลสถาบันไม่ได้: ${errorMessage(error)}` }));
  }

  return { title: 'สถาบัน', element: root };
}

import type { PageView } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { createErrorState } from '../../core/ui/feedback';
import { reactIcon } from '../../core/ui/react-icon';
import { universitiesApi } from './universities-api';

export async function universitiesPage(): Promise<PageView> {
  const root = el('section', { className: 'platform-page universities-page' });
  root.append(
    el('div', { className: 'page-header universities-page__header' },
      el('div', {},
        el('p', { className: 'eyebrow', text: '3 พระจอมฯ' }),
        el('h1', { className: 'platform-title', text: 'สถาบัน' }),
        el('p', { className: 'page-subtitle', text: 'สำรวจชุมชนนักศึกษาจากทั้ง 3 มหาวิทยาลัยพระจอมเกล้า' }),
      ),
    ),
  );

  const grid = el('div', { className: 'university-grid' });
  root.append(grid);

  try {
    const items = await universitiesApi.list();
    for (const university of items) {
      const card = el('a', {
        className: `university-card university-card--${university.code.toLowerCase()}`,
        attrs: {
          href: `/universities/${university.code}`,
          'aria-label': `เปิดชุมชน ${university.name}`,
        },
      });

      const banner = el('div', { className: 'university-card__banner' },
        el('div', { className: 'university-card__mark', attrs: { 'aria-hidden': 'true' } }, reactIcon('university', { size: 24 })),
        el('span', { className: 'university-card__code', text: university.code }),
      );

      const body = el('div', { className: 'university-card__body' });
      body.append(
        el('h2', { text: university.shortName || university.code }),
        el('p', { className: 'university-card__name', text: university.name }),
      );

      const stats = el('div', { className: 'university-card__stats' },
        el('span', {}, el('strong', { text: university.memberCount.toLocaleString('th-TH') }), document.createTextNode(' สมาชิก')),
        el('span', {}, el('strong', { text: university.postCount.toLocaleString('th-TH') }), document.createTextNode(' โพสต์')),
      );
      const statusText = university.postCount > 0 ? 'มีการเคลื่อนไหวในชุมชน' : 'กำลังรอโพสต์แรก';
      const footer = el('div', { className: 'university-card__footer' },
        el('span', { className: 'university-card__status', text: statusText }),
        el('span', { className: 'university-card__cta' }, document.createTextNode('เข้าสู่ชุมชน'), reactIcon('arrow-right', { size: 13 })),
      );

      card.append(banner, body, stats, footer);
      grid.append(card);
    }
  } catch (error) {
    const state = createErrorState({
      title: 'โหลดข้อมูลสถาบันไม่สำเร็จ',
      message: errorMessage(error),
      onRetry: () => window.location.reload(),
    });
    state.classList.add('university-grid__state');
    grid.append(state);
  }

  return { title: 'สถาบัน', element: root };
}

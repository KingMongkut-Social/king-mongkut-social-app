import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { pagination, postCard } from '../posts/post-components';
import { universitiesApi, type UniversityCode } from './universities-api';

function validCode(value: string): value is UniversityCode {
  return value === 'KMITL' || value === 'KMUTT' || value === 'KMUTNB';
}

export async function universityPage(context: RouteContext): Promise<PageView> {
  const code = context.params.code ?? '';
  if (!validCode(code)) return { title: 'ไม่พบสถาบัน', element: el('div'), redirectTo: '/universities' };
  const page = Math.max(1, Number(context.query.get('page') ?? 1) || 1);
  const root = el('section', { className: 'platform-page university-detail-page' });

  try {
    const [university, posts, members] = await Promise.all([
      universitiesApi.get(code),
      universitiesApi.posts(code, page),
      universitiesApi.members(code, 1),
    ]);

    const hero = el('header', { className: `university-hero university-hero--${code.toLowerCase()}` });
    hero.append(
      el('div', { className: 'university-hero__cover' }),
      el('div', { className: 'university-hero__logo', text: code }),
      el('div', { className: 'university-hero__body' },
        el('h1', { text: code }),
        el('p', { text: university.name }),
        el('span', { className: 'platform-meta', text: `${university.memberCount.toLocaleString()} สมาชิก` }),
      ),
    );

    const layout = el('div', { className: 'community-layout' });
    const feed = el('div', { className: 'community-feed' });
    feed.append(el('h2', { text: 'Community Feed' }));
    if (posts.items.length) posts.items.forEach((post) => feed.append(postCard(post)));
    else feed.append(el('div', { className: 'platform-state', text: 'ยังไม่มีโพสต์ในชุมชนนี้' }));
    const pager = pagination(posts.page, posts.pages, '', `/universities/${code}`);
    if (pager) feed.append(pager);

    const sidebar = el('aside', { className: 'community-sidebar' });
    sidebar.append(el('h2', { text: 'คนที่น่าสนใจ' }));
    if (!members.items.length) sidebar.append(el('p', { className: 'platform-state', text: 'ยังไม่มีสมาชิก' }));
    for (const member of members.items.slice(0, 8)) {
      sidebar.append(el('a', { className: 'community-person', attrs: { href: `/profile/${member.id}` } },
        el('span', { className: 'community-person__avatar', text: member.name.charAt(0).toUpperCase() }),
        el('span', {}, el('strong', { text: member.name }), el('small', { text: member.faculty || member.department || code })),
      ));
    }
    layout.append(feed, sidebar);
    root.append(hero, layout);
  } catch (error) {
    root.append(el('div', { className: 'platform-state platform-state--error', text: errorMessage(error) }));
  }

  return { title: code, element: root };
}

import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { postCard } from '../posts/post-components';
import { searchApi } from './search-api';

export async function searchPage(context: RouteContext): Promise<PageView> {
  const q = context.query.get('q')?.trim() ?? '';
  const root = el('section', { className: 'platform-page search-page' });
  root.append(el('h1', { className: 'platform-title', text: 'สำรวจ' }));

  const form = el('form', { className: 'platform-search platform-search--large' });
  const input = el('input', { attrs: { type: 'search', value: q, placeholder: 'ค้นหาเพื่อน, สถาบัน, กลุ่ม, โพสต์...' } });
  form.append(input, el('button', { className: 'button button--primary', text: 'ค้นหา', attrs: { type: 'submit' } }));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim();
    window.history.pushState(null, '', value ? `/search?q=${encodeURIComponent(value)}` : '/search');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  root.append(form);

  if (!q) {
    root.append(el('div', { className: 'platform-state', text: 'พิมพ์คำค้นหาเพื่อสำรวจเครือข่าย KingMongkut Social' }));
    return { title: 'สำรวจ', element: root };
  }

  try {
    const result = await searchApi.search(q);
    const sections = el('div', { className: 'search-results' });

    const people = el('section', { className: 'search-section' });
    people.append(el('h2', { text: 'ผู้ใช้' }));
    if (!result.users.length) people.append(el('p', { className: 'platform-state', text: 'ไม่พบผู้ใช้' }));
    for (const user of result.users) {
      people.append(el('a', { className: 'search-row', attrs: { href: `/profile/${user.id}` } },
        el('span', { className: 'community-person__avatar', text: user.name.charAt(0).toUpperCase() }),
        el('span', {}, el('strong', { text: user.name }), el('small', { text: `${user.university} · ${user.faculty || user.department || ''}` })),
      ));
    }

    const universities = el('section', { className: 'search-section' });
    universities.append(el('h2', { text: 'สถาบัน' }));
    for (const university of result.universities) {
      universities.append(el('a', { className: 'search-row', attrs: { href: `/universities/${university.code}` } },
        el('span', { className: 'community-person__avatar', text: university.code.slice(0, 1) }),
        el('span', {}, el('strong', { text: university.code }), el('small', { text: university.name })),
      ));
    }

    const groups = el('section', { className: 'search-section' });
    groups.append(el('h2', { text: 'กลุ่ม' }));
    for (const group of result.groups) {
      groups.append(el('a', { className: 'search-row', attrs: { href: `/groups/${group.id}` } },
        el('span', { className: 'community-person__avatar', text: '👥' }),
        el('span', {}, el('strong', { text: group.name }), el('small', { text: group.description || group.university || '' })),
      ));
    }

    const posts = el('section', { className: 'search-section search-section--posts' });
    posts.append(el('h2', { text: 'โพสต์' }));
    if (!result.posts.length) posts.append(el('p', { className: 'platform-state', text: 'ไม่พบโพสต์' }));
    result.posts.forEach((post) => posts.append(postCard(post)));

    sections.append(people, universities, groups, posts);
    root.append(sections);
  } catch (error) {
    root.append(el('div', { className: 'platform-state platform-state--error', text: errorMessage(error) }));
  }
  return { title: `ค้นหา ${q}`, element: root };
}

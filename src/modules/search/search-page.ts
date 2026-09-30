import type { PageView, RouteContext } from '../../core/router/router';
import { clear, el } from '../../core/ui/dom';
import { createEmptyState, createErrorState } from '../../core/ui/feedback';
import { postCard } from '../posts/post-components';
import { searchApi, type SearchResult } from './search-api';

type SearchCategory = 'all' | 'users' | 'posts' | 'groups' | 'universities';

function normalizeType(raw: string | null): SearchCategory {
  if (raw === 'people' || raw === 'users') return 'users';
  if (raw === 'posts') return 'posts';
  if (raw === 'groups') return 'groups';
  if (raw === 'universities') return 'universities';
  return 'all';
}

export async function searchPage(context: RouteContext): Promise<PageView> {
  const q = context.query.get('q')?.trim() ?? '';
  let activeTab: SearchCategory = normalizeType(context.query.get('type'));

  const root = el('section', { className: 'platform-page search-page' });
  root.append(el('h1', { className: 'platform-title', text: 'สำรวจ' }));

  const form = el('form', { className: 'platform-search platform-search--large' });
  const input = el('input', {
    attrs: {
      type: 'search',
      value: q,
      placeholder: 'ค้นหาเพื่อน, สถาบัน, กลุ่ม, โพสต์...',
      'aria-label': 'ค้นหา',
    },
  });
  form.append(
    input,
    el('button', { className: 'button button--primary', text: 'ค้นหา', attrs: { type: 'submit' } }),
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim();
    const query = new URLSearchParams();
    if (value) query.set('q', value);
    if (activeTab !== 'all') query.set('type', activeTab);
    const target = query.size ? `/search?${query}` : '/search';
    window.history.pushState(null, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  root.append(form);

  if (!q) {
    root.append(createEmptyState({
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
      title: 'พิมพ์คำค้นหาเพื่อสำรวจ',
      description: 'ค้นหาเพื่อนนักศึกษา กลุ่มกิจกรรม มหาวิทยาลัย หรือโพสต์ที่สนใจในเครือข่าย 3 พระจอมฯ',
    }));
    return { title: 'สำรวจ', element: root };
  }

  try {
    const result: SearchResult = await searchApi.search(q);
    const totalCount = result.users.length + result.universities.length + result.groups.length + result.posts.length;

    // Summary text
    const summary = el('p', {
      className: 'text-meta',
      attrs: { style: 'margin: 0 0 var(--space-2);' },
      text: `ผลการค้นหาสำหรับ “${q}” (พบทั้งหมด ${totalCount} รายการ)`,
    });
    root.append(summary);

    // Tab buttons
    const tabsBar = el('div', { className: 'search-tabs', attrs: { role: 'tablist', 'aria-label': 'หมวดหมู่การค้นหา' } });
    const tabConfigs: Array<{ id: SearchCategory; label: string; count: number }> = [
      { id: 'all', label: 'ทั้งหมด', count: totalCount },
      { id: 'users', label: 'ผู้ใช้', count: result.users.length },
      { id: 'posts', label: 'โพสต์', count: result.posts.length },
      { id: 'groups', label: 'กลุ่ม', count: result.groups.length },
      { id: 'universities', label: 'สถาบัน', count: result.universities.length },
    ];

    const resultsContainer = el('div', { className: 'search-results' });

    const switchTab = (tabId: SearchCategory) => {
      activeTab = tabId;
      const query = new URLSearchParams();
      query.set('q', q);
      if (activeTab !== 'all') query.set('type', activeTab);
      window.history.pushState(null, '', `/search?${query}`);

      for (const btn of tabsBar.querySelectorAll<HTMLButtonElement>('.search-tab-btn')) {
        const isCurrent = btn.dataset.tabId === activeTab;
        btn.classList.toggle('search-tab-btn--active', isCurrent);
        btn.setAttribute('aria-selected', String(isCurrent));
      }
      renderContent();
    };

    for (const conf of tabConfigs) {
      const btn = el('button', {
        className: `search-tab-btn ${conf.id === activeTab ? 'search-tab-btn--active' : ''}`,
        attrs: {
          type: 'button',
          role: 'tab',
          'aria-selected': String(conf.id === activeTab),
          'data-tab-id': conf.id,
        },
        text: `${conf.label} (${conf.count})`,
      });
      btn.addEventListener('click', () => switchTab(conf.id));
      tabsBar.append(btn);
    }
    root.append(tabsBar);
    root.append(resultsContainer);

    const renderUsers = (items = result.users, showAllBtn = false) => {
      const sec = el('section', { className: 'search-section' });
      const h2 = el('h2', { text: `ผู้ใช้ (${result.users.length})` });
      if (showAllBtn && result.users.length > 3) {
        const seeAll = el('button', {
          className: 'button button--secondary button--small',
          attrs: { type: 'button' },
          text: `ดูทั้งหมด (${result.users.length})`,
        });
        seeAll.addEventListener('click', () => switchTab('users'));
        h2.append(seeAll);
      }
      sec.append(h2);

      if (!items.length) {
        sec.append(el('p', { className: 'text-meta', text: 'ไม่พบผู้ใช้ที่ตรงกับคำค้นหา' }));
        return sec;
      }

      for (const user of items) {
        sec.append(el('a', { className: 'search-row', attrs: { href: `/profile/${user.id}` } },
          el('span', { className: 'community-person__avatar', text: user.name.charAt(0).toUpperCase() }),
          el('span', {},
            el('strong', { text: user.name }),
            el('small', { text: `${user.university} · ${user.faculty || user.department || ''}` }),
          ),
        ));
      }
      return sec;
    };

    const renderUniversities = (items = result.universities, showAllBtn = false) => {
      const sec = el('section', { className: 'search-section' });
      const h2 = el('h2', { text: `สถาบัน (${result.universities.length})` });
      if (showAllBtn && result.universities.length > 3) {
        const seeAll = el('button', {
          className: 'button button--secondary button--small',
          attrs: { type: 'button' },
          text: `ดูทั้งหมด (${result.universities.length})`,
        });
        seeAll.addEventListener('click', () => switchTab('universities'));
        h2.append(seeAll);
      }
      sec.append(h2);

      if (!items.length) {
        sec.append(el('p', { className: 'text-meta', text: 'ไม่พบสถาบันที่ตรงกับคำค้นหา' }));
        return sec;
      }

      for (const university of items) {
        sec.append(el('a', { className: 'search-row', attrs: { href: `/universities/${university.code}` } },
          el('span', { className: 'community-person__avatar', text: university.code.slice(0, 1) }),
          el('span', {},
            el('strong', { text: university.code }),
            el('small', { text: university.name }),
          ),
        ));
      }
      return sec;
    };

    const renderGroups = (items = result.groups, showAllBtn = false) => {
      const sec = el('section', { className: 'search-section' });
      const h2 = el('h2', { text: `กลุ่ม (${result.groups.length})` });
      if (showAllBtn && result.groups.length > 3) {
        const seeAll = el('button', {
          className: 'button button--secondary button--small',
          attrs: { type: 'button' },
          text: `ดูทั้งหมด (${result.groups.length})`,
        });
        seeAll.addEventListener('click', () => switchTab('groups'));
        h2.append(seeAll);
      }
      sec.append(h2);

      if (!items.length) {
        sec.append(el('p', { className: 'text-meta', text: 'ไม่พบกลุ่มที่ตรงกับคำค้นหา' }));
        return sec;
      }

      for (const group of items) {
        sec.append(el('a', { className: 'search-row', attrs: { href: `/groups/${group.id}` } },
          el('span', { className: 'community-person__avatar', text: '👥' }),
          el('span', {},
            el('strong', { text: group.name }),
            el('small', { text: group.description || group.university || '' }),
          ),
        ));
      }
      return sec;
    };

    const renderPosts = (items = result.posts, showAllBtn = false) => {
      const sec = el('section', { className: 'search-section search-section--posts' });
      const h2 = el('h2', { text: `โพสต์ (${result.posts.length})` });
      if (showAllBtn && result.posts.length > 3) {
        const seeAll = el('button', {
          className: 'button button--secondary button--small',
          attrs: { type: 'button' },
          text: `ดูทั้งหมด (${result.posts.length})`,
        });
        seeAll.addEventListener('click', () => switchTab('posts'));
        h2.append(seeAll);
      }
      sec.append(h2);

      if (!items.length) {
        sec.append(el('p', { className: 'platform-state', text: 'ไม่พบโพสต์ที่ตรงกับคำค้นหา' }));
        return sec;
      }

      items.forEach((post) => sec.append(postCard(post)));
      return sec;
    };

    const renderContent = () => {
      clear(resultsContainer);
      if (totalCount === 0) {
        resultsContainer.append(createEmptyState({
          title: 'ไม่พบผลการค้นหา',
          description: `ไม่พบข้อมูลที่ตรงกับคำค้นหา “${q}” ลองตรวจสอบตัวสะกด หรือใช้คำค้นหาอื่น`,
        }));
        return;
      }

      if (activeTab === 'all') {
        if (result.users.length) resultsContainer.append(renderUsers(result.users.slice(0, 3), true));
        if (result.universities.length) resultsContainer.append(renderUniversities(result.universities.slice(0, 3), true));
        if (result.groups.length) resultsContainer.append(renderGroups(result.groups.slice(0, 3), true));
        if (result.posts.length) resultsContainer.append(renderPosts(result.posts.slice(0, 3), true));
      } else if (activeTab === 'users') {
        resultsContainer.append(renderUsers(result.users, false));
      } else if (activeTab === 'universities') {
        resultsContainer.append(renderUniversities(result.universities, false));
      } else if (activeTab === 'groups') {
        resultsContainer.append(renderGroups(result.groups, false));
      } else if (activeTab === 'posts') {
        resultsContainer.append(renderPosts(result.posts, false));
      }
    };

    renderContent();
  } catch (error) {
    root.append(createErrorState({ message: `เกิดข้อผิดพลาดในการค้นหา: ${error instanceof Error ? error.message : String(error)}` }));
  }

  return { title: `ค้นหา “${q}”`, element: root };
}

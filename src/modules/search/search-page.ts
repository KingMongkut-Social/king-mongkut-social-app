import type { PageView, RouteContext } from '../../core/router/router';
import { clear, el } from '../../core/ui/dom';
import { createEmptyState, createErrorState } from '../../core/ui/feedback';
import { reactIcon, type AppIconName } from '../../core/ui/react-icon';
import { createAvatar, createUniversityBadge } from '../../core/ui/avatar';
import { profileImageUrl } from '../profile/profile-api';
import { toast } from '../../core/ui/toast';
import { errorMessage } from '../../core/ui/error-message';
import { postCard } from '../posts/post-components';
import {
  searchApi,
  type SearchGroup,
  type SearchResult,
  type SearchUniversity,
  type SearchUser,
} from './search-api';
import type { Post } from '../../types/api';

type SearchCategory = 'all' | 'users' | 'posts' | 'groups' | 'universities';

function normalizeType(raw: string | null): SearchCategory {
  if (raw === 'people' || raw === 'users') return 'users';
  if (raw === 'posts') return 'posts';
  if (raw === 'groups') return 'groups';
  if (raw === 'universities') return 'universities';
  return 'all';
}

function renderUserRow(user: SearchUser): HTMLElement {
  const row = el('a', { className: 'search-row', attrs: { href: `/profile/${user.id}` } });
  const avatar = createAvatar({
    url: user.avatarUrl,
    name: user.name,
    size: 'md',
    className: 'search-user-avatar',
  });
  const info = el('span', { className: 'search-user-info' });
  const meta = el('span', { className: 'search-user-meta' });
  if (user.username) {
    meta.append(el('span', { className: 'search-user-handle', text: `@${user.username} · ` }));
  }
  meta.append(createUniversityBadge(user.university));
  if (user.faculty || user.department) {
    meta.append(el('small', { text: ` · ${user.faculty || user.department}` }));
  }
  info.append(
    el('strong', { className: 'search-user-name', text: user.name }),
    meta,
  );
  row.append(avatar, info);
  return row;
}

function renderGroupRow(group: SearchGroup): HTMLElement {
  const row = el('a', { className: 'search-row', attrs: { href: `/groups/${group.id}` } });
  const thumb = el('div', { className: 'search-group-thumb' });
  if (group.coverUrl) {
    const img = el('img', {
      attrs: {
        src: profileImageUrl(group.coverUrl),
        alt: group.name,
        loading: 'lazy',
      },
    });
    img.addEventListener('error', () => {
      thumb.replaceChildren(el('span', { className: 'community-person__avatar' }, reactIcon('users')));
    });
    thumb.append(img);
  } else {
    thumb.append(el('span', { className: 'community-person__avatar' }, reactIcon('users')));
  }

  const info = el('span', { className: 'search-group-info' });
  const meta = el('span', { className: 'search-group-meta' });
  if (group.university) {
    meta.append(createUniversityBadge(group.university));
  }
  if (group.memberCount !== undefined) {
    meta.append(el('small', { text: ` · ${group.memberCount} สมาชิก` }));
  }
  if (group.description) {
    meta.append(el('small', { text: ` · ${group.description}` }));
  }
  info.append(
    el('strong', { text: group.name }),
    meta,
  );
  row.append(thumb, info);
  return row;
}

function renderUniversityRow(university: SearchUniversity): HTMLElement {
  return el('a', { className: 'search-row', attrs: { href: `/universities/${university.code}` } },
    createUniversityBadge(university.code),
    el('span', {},
      el('strong', { text: university.code }),
      el('small', { text: university.name }),
    ),
  );
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
    const hub = el('div', { className: 'explore-hub' });
    const hubTitle = el('h2', { className: 'explore-hub__title', text: 'หมวดหมู่สำรวจลัด' });
    const hubGrid = el('div', { className: 'explore-hub__grid' });

    const shortcuts: ReadonlyArray<{ href: string; icon: AppIconName; title: string; desc: string }> = [
      { href: '/connections', icon: 'users', title: 'เพื่อน & การเชื่อมต่อ', desc: 'ค้นหาเพื่อนนักศึกษาและเครือข่าย' },
      { href: '/groups', icon: 'globe', title: 'กลุ่มชุมชน', desc: 'กลุ่มกิจกรรม สโมสร และชมรมความสนใจ' },
      { href: '/universities', icon: 'university', title: 'สถาบัน 3 พระจอมฯ', desc: 'ลาดกระบัง • ธนบุรี • พระนครเหนือ' },
      { href: '/chat', icon: 'comments', title: 'ข้อความ & แชท', desc: 'พูดคุยส่วนตัวและสนทนากลุ่ม' },
      { href: '/?saved=1', icon: 'bookmark', title: 'โพสต์ที่บันทึกไว้', desc: 'โพสต์ที่คุณบุ๊กมาร์กไว้เพื่ออ่านต่อ' },
      { href: '/notifications', icon: 'bell', title: 'การแจ้งเตือน', desc: 'ติดตามกิจกรรมและการโต้ตอบล่าสุด' },
    ];

    for (const item of shortcuts) {
      const card = el('a', {
        className: 'explore-shortcut-card',
        attrs: { href: item.href },
      });
      card.append(
        el('div', { className: 'explore-shortcut-card__icon' }, reactIcon(item.icon)),
        el('div', { className: 'explore-shortcut-card__text' },
          el('strong', { text: item.title }),
          el('small', { text: item.desc }),
        ),
      );
      hubGrid.append(card);
    }
    hub.append(hubTitle, hubGrid);
    root.append(hub);

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
        sec.append(renderUserRow(user));
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
        sec.append(renderUniversityRow(university));
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
        sec.append(renderGroupRow(group));
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

    const createLoadMoreButton = (
      tabCategory: SearchCategory,
      itemsListEl: HTMLElement,
      appendFn: (item: SearchUser | Post | SearchGroup | SearchUniversity) => void,
    ) => {
      let pageNum = 1;
      let isLoading = false;
      const btn = el('button', {
        className: 'button button--secondary search-load-more-btn',
        attrs: { type: 'button' },
        text: 'โหลดผลการค้นหาเพิ่มเติม',
      });
      btn.addEventListener('click', async () => {
        if (isLoading) return;
        isLoading = true;
        btn.disabled = true;
        btn.textContent = 'กำลังโหลด...';
        try {
          const res = await searchApi.search(q, { type: tabCategory, page: pageNum + 1, limit: 10 });
          pageNum++;
          const newItems = (tabCategory === 'users' ? res.users
            : tabCategory === 'posts' ? res.posts
            : tabCategory === 'groups' ? res.groups
            : res.universities) || res.items || [];
          for (const item of newItems) {
            appendFn(item);
          }
          if (res.pages && pageNum >= res.pages) {
            btn.remove();
          } else {
            btn.textContent = 'โหลดผลการค้นหาเพิ่มเติม';
            btn.disabled = false;
          }
        } catch (err) {
          toast.error(errorMessage(err));
          btn.textContent = 'ลองใหม่อีกครั้ง';
          btn.disabled = false;
        } finally {
          isLoading = false;
        }
      });
      itemsListEl.append(btn);
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
        const sec = renderUsers(result.users, false);
        resultsContainer.append(sec);
        if (result.pages && result.pages > 1) {
          createLoadMoreButton('users', sec, (user) => sec.append(renderUserRow(user as SearchUser)));
        }
      } else if (activeTab === 'universities') {
        const sec = renderUniversities(result.universities, false);
        resultsContainer.append(sec);
        if (result.pages && result.pages > 1) {
          createLoadMoreButton('universities', sec, (uni) => sec.append(renderUniversityRow(uni as SearchUniversity)));
        }
      } else if (activeTab === 'groups') {
        const sec = renderGroups(result.groups, false);
        resultsContainer.append(sec);
        if (result.pages && result.pages > 1) {
          createLoadMoreButton('groups', sec, (grp) => sec.append(renderGroupRow(grp as SearchGroup)));
        }
      } else if (activeTab === 'posts') {
        const sec = renderPosts(result.posts, false);
        resultsContainer.append(sec);
        if (result.pages && result.pages > 1) {
          createLoadMoreButton('posts', sec, (p) => sec.append(postCard(p as Post)));
        }
      }
    };

    renderContent();
  } catch (error) {
    root.append(createErrorState({ message: `เกิดข้อผิดพลาดในการค้นหา: ${error instanceof Error ? error.message : String(error)}` }));
  }

  return { title: `ค้นหา “${q}”`, element: root };
}

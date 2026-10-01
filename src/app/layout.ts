import { authApi } from '../core/auth/auth-api';
import { authStore } from '../core/auth/auth-store';
import { notificationStore } from '../core/notifications/notification-store';
import type { Router } from '../core/router/router';
import { mobileItemsForState, sidebarActionForState, sidebarItemsForState, type NavigationItem } from './navigation';
import { clear, el } from '../core/ui/dom';
import { errorMessage } from '../core/ui/error-message';
import { toast } from '../core/ui/toast';
import { createAvatar } from '../core/ui/avatar';
import { createNotificationTypeBadge } from '../core/ui/notification-icon';
import { reactIcon, type AppIconName } from '../core/ui/react-icon';
import { formatRelativeTime } from '../core/utils/format';
import { profileImageUrl } from '../modules/profile/profile-api';
import { searchApi, type SearchResult, type SearchUser, type SearchGroup } from '../modules/search/search-api';

const navigationIcons: Record<NavigationItem['icon'], AppIconName> = {
  feed: 'feed',
  connections: 'connections',
  chats: 'comments',
  institutions: 'university',
  groups: 'users',
  bookmark: 'bookmark',
  posts: 'posts',
  shield: 'shield',
  search: 'search',
  user: 'user',
  plus: 'plus',
};

export function mountLayout(root: HTMLElement): HTMLElement {
  // Top Header
  const header = el('header', { className: 'site-header' });
  const headerInner = el('div', { className: 'site-header__inner' });

  const brand = el('a', { className: 'brand-title', text: 'KingMongkut Social', attrs: { href: '/' } });

  // Search input in header with autocomplete
  const searchWrap = el('div', { className: 'site-header__search' });
  const searchIcon = el('span', { className: 'site-header__search-icon' });
  searchIcon.append(reactIcon('search', { size: 16 }));
  const searchInput = el('input', {
    className: 'search-pill-input',
    attrs: {
      type: 'search',
      placeholder: 'ค้นหาเพื่อน, สถาบัน, โพสต์...',
      'aria-label': 'ค้นหา',
      autocomplete: 'off',
    },
  });

  const autocompleteDropdown = el('div', {
    className: 'header-search-autocomplete',
    attrs: { role: 'listbox', 'aria-label': 'ผลการค้นหาด่วน', style: 'display: none;' },
  });

  let searchDebounceTimer = 0;
  let activeItemIndex = -1;
  let currentResultsItems: HTMLAnchorElement[] = [];

  const closeAutocomplete = (): void => {
    autocompleteDropdown.style.display = 'none';
    autocompleteDropdown.replaceChildren();
    activeItemIndex = -1;
    currentResultsItems = [];
  };

  const updateFocusedItem = (newIndex: number): void => {
    if (!currentResultsItems.length) return;
    if (activeItemIndex >= 0 && activeItemIndex < currentResultsItems.length) {
      currentResultsItems[activeItemIndex]?.classList.remove(
        'header-search-autocomplete__item--focused',
        'header-search-autocomplete__footer--focused',
      );
    }
    if (newIndex < 0) {
      newIndex = currentResultsItems.length - 1;
    } else if (newIndex >= currentResultsItems.length) {
      newIndex = 0;
    }
    activeItemIndex = newIndex;
    const item = currentResultsItems[activeItemIndex];
    if (item) {
      const isFooter = item.classList.contains('header-search-autocomplete__footer');
      item.classList.add(isFooter ? 'header-search-autocomplete__footer--focused' : 'header-search-autocomplete__item--focused');
      item.scrollIntoView?.({ block: 'nearest' });
    }
  };

  const renderAutocompleteResults = (q: string, results: SearchResult): void => {
    autocompleteDropdown.replaceChildren();
    currentResultsItems = [];
    activeItemIndex = -1;

    const hasUsers = results.users && results.users.length > 0;
    const hasGroups = results.groups && results.groups.length > 0;

    if (!hasUsers && !hasGroups) {
      autocompleteDropdown.append(el('div', {
        className: 'header-search-autocomplete__empty',
        text: `ไม่พบผลการค้นหาสำหรับ "${q}"`,
      }));
    } else {
      if (hasUsers) {
        autocompleteDropdown.append(el('div', {
          className: 'header-search-autocomplete__section-title',
          text: 'ผู้ใช้',
        }));
        results.users.slice(0, 3).forEach((user: SearchUser) => {
          const item = el('a', {
            className: 'header-search-autocomplete__item',
            attrs: { href: `/profile/${user.id}`, role: 'option' },
          });
          const avatar = createAvatar({
            url: user.avatarUrl,
            name: user.name,
            size: 'sm',
          });
          const info = el('div', { className: 'header-search-autocomplete__info' });
          info.append(
            el('div', { className: 'header-search-autocomplete__title', text: user.name }),
            el('div', {
              className: 'header-search-autocomplete__meta',
              text: [user.username ? `@${user.username}` : '', user.university].filter(Boolean).join(' • '),
            }),
          );
          item.append(avatar, info);
          item.addEventListener('click', (e) => {
            e.preventDefault();
            closeAutocomplete();
            searchInput.value = '';
            window.history.pushState(null, '', `/profile/${user.id}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
          });
          autocompleteDropdown.append(item);
          currentResultsItems.push(item);
        });
      }

      if (hasGroups) {
        autocompleteDropdown.append(el('div', {
          className: 'header-search-autocomplete__section-title',
          text: 'กลุ่ม',
        }));
        results.groups.slice(0, 3).forEach((group: SearchGroup) => {
          const item = el('a', {
            className: 'header-search-autocomplete__item',
            attrs: { href: `/groups/${group.id}`, role: 'option' },
          });
          const iconWrap = el('div', { className: 'header-search-autocomplete__group-icon' });
          if (group.coverUrl) {
            const img = el('img', {
              className: 'header-search-autocomplete__group-thumb',
              attrs: { src: group.coverUrl, alt: group.name, loading: 'lazy' },
            });
            iconWrap.append(img);
          } else {
            iconWrap.replaceChildren(reactIcon('users'));
          }
          const info = el('div', { className: 'header-search-autocomplete__info' });
          info.append(
            el('div', { className: 'header-search-autocomplete__title', text: group.name }),
            el('div', {
              className: 'header-search-autocomplete__meta',
              text: `${group.university ? group.university + ' • ' : ''}${group.memberCount ?? 0} สมาชิก`,
            }),
          );
          item.append(iconWrap, info);
          item.addEventListener('click', (e) => {
            e.preventDefault();
            closeAutocomplete();
            searchInput.value = '';
            window.history.pushState(null, '', `/groups/${group.id}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
          });
          autocompleteDropdown.append(item);
          currentResultsItems.push(item);
        });
      }
    }

    const footerLink = el('a', {
      className: 'header-search-autocomplete__footer',
      attrs: { href: `/search?q=${encodeURIComponent(q)}` },
    });
    footerLink.append(
      document.createTextNode(`ดูผลลัพธ์ทั้งหมดสำหรับ "${q}" `),
      reactIcon('arrow-right'),
    );
    footerLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeAutocomplete();
      window.history.pushState(null, '', `/search?q=${encodeURIComponent(q)}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    autocompleteDropdown.append(footerLink);
    currentResultsItems.push(footerLink);

    autocompleteDropdown.style.display = 'flex';
  };

  searchInput.addEventListener('input', () => {
    window.clearTimeout(searchDebounceTimer);
    const q = searchInput.value.trim();
    if (q.length < 2) {
      closeAutocomplete();
      return;
    }
    searchDebounceTimer = window.setTimeout(async () => {
      try {
        const results = await searchApi.search(q, { limit: 5 });
        if (searchInput.value.trim() === q) {
          renderAutocompleteResults(q, results);
        }
      } catch {
        // Silently ignore autocomplete errors
      }
    }, 300);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      if (autocompleteDropdown.style.display !== 'none' && currentResultsItems.length > 0) {
        e.preventDefault();
        updateFocusedItem(activeItemIndex + 1);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      if (autocompleteDropdown.style.display !== 'none' && currentResultsItems.length > 0) {
        e.preventDefault();
        updateFocusedItem(activeItemIndex - 1);
      }
      return;
    }
    if (e.key === 'Escape') {
      closeAutocomplete();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeItemIndex >= 0 && activeItemIndex < currentResultsItems.length) {
        const item = currentResultsItems[activeItemIndex];
        if (item) {
          item.click();
          return;
        }
      }
      const q = searchInput.value.trim();
      closeAutocomplete();
      const target = q ? `/search?q=${encodeURIComponent(q)}` : '/search';
      window.history.pushState(null, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });

  document.addEventListener('click', (e) => {
    if (!searchWrap.contains(e.target as Node)) {
      closeAutocomplete();
    }
  });

  searchWrap.append(searchIcon, searchInput, autocompleteDropdown);

  // Right Header Actions
  const headerActions = el('div', { className: 'site-header__actions' });

  // Mobile search icon button (accessible when input is hidden on mobile)
  const mobileSearchBtn = el('a', {
    className: 'icon-btn site-header__mobile-search-btn',
    attrs: { href: '/search', 'aria-label': 'ค้นหา', title: 'ค้นหา' },
  });
  mobileSearchBtn.append(reactIcon('search', { size: 18 }));
  headerActions.append(mobileSearchBtn);

  // Notification Bell & Interactive Dropdown
  const bellWrap = el('div', { className: 'notification-bell-wrap' });
  const bellBtn = el('button', {
    className: 'icon-btn',
    attrs: {
      type: 'button',
      'aria-label': 'การแจ้งเตือน',
      title: 'การแจ้งเตือน',
      'aria-haspopup': 'true',
      'aria-expanded': 'false',
    },
  });
  bellBtn.append(reactIcon('bell', { size: 19 }));
  bellBtn.append(el('span', { className: 'header-action-label', text: 'การแจ้งเตือน' }));

  const notifBadge = el('span', { className: 'notification-badge', attrs: { style: 'display: none;' } });

  const notifDropdown = el('div', {
    className: 'notifications-dropdown',
    attrs: {
      id: 'notifications-dropdown',
      role: 'region',
      'aria-label': 'รายการการแจ้งเตือน',
      style: 'display: none;',
    },
  });
  bellBtn.setAttribute('aria-controls', 'notifications-dropdown');
  const notifHeader = el('div', { className: 'notifications-dropdown__header' });
  const notifTitle = el('span', { className: 'notifications-dropdown__title', text: 'การแจ้งเตือน' });
  const markAllReadBtn = el('button', {
    className: 'notifications-dropdown__mark-read',
    attrs: { type: 'button' },
    text: 'อ่านทั้งหมด',
  });
  markAllReadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationStore.markAllAsRead();
  });
  notifHeader.append(notifTitle, markAllReadBtn);

  const notifList = el('div', { className: 'notifications-dropdown__list' });
  notifDropdown.append(notifHeader, notifList);

  const renderNotifications = () => {
    const notifications = notificationStore.getAll();
    const unreadCount = notificationStore.getUnreadCount();

    if (unreadCount > 0) {
      notifBadge.style.display = 'flex';
      notifBadge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
    } else {
      notifBadge.style.display = 'none';
    }

    clear(notifList);
    if (notifications.length === 0) {
      const empty = el('div', { className: 'notifications-empty', text: 'ไม่มีการแจ้งเตือนในขณะนี้' });
      notifList.append(empty);
      return;
    }

    notifications.forEach((n) => {
      const item = el('div', {
        className: `notification-item ${!n.read ? 'notification-item--unread' : ''}`,
      });

      // Avatar with type badge
      const avatarWrap = el('div', { className: 'notification-avatar-wrap' });
      const avatar = createAvatar({
        url: n.actorAvatarUrl,
        name: n.actorName,
        size: 'sm',
        className: 'notification-avatar',
      });
      const typeBadge = createNotificationTypeBadge(n.type);
      avatarWrap.append(avatar, typeBadge);

      // Body
      const body = el('div', { className: 'notification-body' });
      const textLine = el('div', { className: 'notification-text' });
      const actor = el('span', { className: 'notification-actor', text: n.actorName });
      textLine.append(actor);

      let actionDesc = '';
      if (n.type === 'post_reaction') actionDesc = ' มีปฏิกิริยาต่อโพสต์ของคุณ';
      else if (n.type === 'post_comment') actionDesc = ' แสดงความคิดเห็นบนโพสต์ของคุณ';
      else if (n.type === 'comment_reply') actionDesc = ' ตอบกลับความคิดเห็นของคุณ';
      else if (n.type === 'friend_request') actionDesc = ' ส่งคำขอเป็นเพื่อนถึงคุณ';
      else if (n.type === 'friend_accept') actionDesc = ' ตอบรับคำขอเป็นเพื่อนของคุณ';
      else if (n.type === 'group_join') actionDesc = ' เข้าร่วมกลุ่มของคุณ';
      else if (n.type === 'group_invite') actionDesc = ' เชิญคุณเข้าร่วมกลุ่ม';
      else if (n.type === 'group_mention') actionDesc = ' แท็กคุณในโพสต์ในกลุ่ม';
      else actionDesc = ' มีกิจกรรมใหม่';
      textLine.append(document.createTextNode(actionDesc));

      if (n.contentSnippet) {
        const snippet = el('span', {
          className: 'notification-snippet',
          text: `“${n.contentSnippet}”`,
        });
        textLine.append(snippet);
      }

      const timeSpan = el('div', {
        className: 'notification-time',
        text: formatRelativeTime(n.createdAt),
      });
      body.append(textLine, timeSpan);

      item.append(avatarWrap, body);

      if (!n.read) {
        const dot = el('span', { className: 'notification-unread-dot' });
        item.append(dot);
      }

      item.addEventListener('click', () => {
        notificationStore.markAsRead(n.id);
        notifDropdown.style.display = 'none';
        bellBtn.setAttribute('aria-expanded', 'false');
        let target = '/';
        if (n.type === 'post_reaction' || n.type === 'post_comment' || n.type === 'comment_reply') {
          target = n.entityId ? `/posts/${encodeURIComponent(n.entityId)}` : '/';
        } else if (n.type === 'friend_request' || n.type === 'friend_accept') {
          target = '/connections';
        } else if (n.type === 'group_invite') {
          target = '/groups';
        } else if (n.type === 'group_join' || n.type === 'group_mention') {
          target = n.entityId ? `/groups/${encodeURIComponent(n.entityId)}` : '/groups';
        }
        window.history.pushState(null, '', target);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      notifList.append(item);
    });
  };

  notificationStore.subscribe(renderNotifications);

  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const accountMenu = root.querySelector<HTMLElement>('.account-menu');
    const accountTrigger = root.querySelector<HTMLElement>('.account-menu-trigger');
    if (accountMenu && accountTrigger) {
      accountMenu.hidden = true;
      accountTrigger.setAttribute('aria-expanded', 'false');
    }
    const isHidden = notifDropdown.style.display === 'none';
    notifDropdown.style.display = isHidden ? 'block' : 'none';
    bellBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  });

  document.addEventListener('click', (e) => {
    if (!bellWrap.contains(e.target as Node)) {
      notifDropdown.style.display = 'none';
      bellBtn.setAttribute('aria-expanded', 'false');
    }
  });

  bellWrap.append(bellBtn, notifBadge, notifDropdown);
  const userActionSlot = el('div', { className: 'site-header__user-slot' });

  document.addEventListener('click', (e) => {
    if (userActionSlot.contains(e.target as Node)) return;
    const menu = userActionSlot.querySelector<HTMLElement>('.account-menu');
    const trigger = userActionSlot.querySelector<HTMLElement>('.account-menu-trigger');
    if (!menu || !trigger) return;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeAutocomplete();
    notifDropdown.style.display = 'none';
    bellBtn.setAttribute('aria-expanded', 'false');
    const menu = userActionSlot.querySelector<HTMLElement>('.account-menu');
    const trigger = userActionSlot.querySelector<HTMLButtonElement>('.account-menu-trigger');
    if (!menu || !trigger || menu.hidden) return;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  });

  headerActions.append(bellWrap, userActionSlot);
  headerInner.append(brand, searchWrap, headerActions);
  header.append(headerInner);


  // App Layout Shell
  const appLayout = el('div', { className: 'app-layout' });
  const sidebar = el('aside', { className: 'app-sidebar' });
  const sidebarTop = el('div', { className: 'sidebar__top' });

  const navTitle = el('div', { className: 'sidebar__section-title', text: 'เมนูหลัก' });
  const navSubtitle = el('div', { className: 'sidebar__subtitle', text: 'เครือข่ายนักศึกษา 3 พระจอมฯ' });
  const navList = el('nav', { className: 'sidebar__nav', attrs: { 'aria-label': 'เมนูหลัก' } });

  sidebarTop.append(navTitle, navSubtitle, navList);

  const sidebarFooter = el('div', { className: 'sidebar__footer' });

  sidebar.append(sidebarTop, sidebarFooter);

  const main = el('main', { className: 'app-content', attrs: { id: 'main-content' } });
  appLayout.append(sidebar, main);

  const mobileNav = el('nav', { className: 'mobile-primary-nav', attrs: { 'aria-label': 'เมนูหลักบนมือถือ' } });
  root.replaceChildren(header, mobileNav, appLayout);

  const isMobileViewport = (): boolean => window.innerWidth <= 1023;
  let lastScrollY = Math.max(0, window.scrollY);
  let scrollFrame = 0;

  const setMobileChromeHidden = (hidden: boolean): void => {
    document.body.classList.toggle('mobile-chrome-hidden', isMobileViewport() && hidden);
  };

  const mobileOverlayOpen = (): boolean => (
    notifDropdown.style.display !== 'none'
    || autocompleteDropdown.style.display !== 'none'
    || Boolean(root.querySelector('.account-menu:not([hidden])'))
  );

  const updateMobileChromeFromScroll = (): void => {
    scrollFrame = 0;
    const current = Math.max(0, window.scrollY);
    if (!isMobileViewport()
      || document.body.classList.contains('is-auth-page')
      || document.body.classList.contains('is-chat-thread-open')) {
      setMobileChromeHidden(false);
      lastScrollY = current;
      return;
    }

    const delta = current - lastScrollY;
    if (current <= 18) {
      setMobileChromeHidden(false);
    } else if (Math.abs(delta) >= 7 && !mobileOverlayOpen()) {
      setMobileChromeHidden(delta > 0);
    }
    lastScrollY = current;
  };

  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateMobileChromeFromScroll);
  }, { passive: true });

  window.addEventListener('resize', () => {
    lastScrollY = Math.max(0, window.scrollY);
    if (!isMobileViewport()) setMobileChromeHidden(false);
  }, { passive: true });

  document.addEventListener('focusin', (event) => {
    if (!isMobileViewport()) return;
    if (event.target instanceof HTMLInputElement
      || event.target instanceof HTMLTextAreaElement
      || event.target instanceof HTMLSelectElement) {
      setMobileChromeHidden(false);
    }
  });

  const updatePageLayoutState = (): void => {
    const path = window.location.pathname;
    const isAuth = ['/login', '/register', '/complete-profile', '/auth/callback'].includes(path);
    const isEditProfile = path === '/profile/edit';
    document.body.classList.toggle('is-auth-page', isAuth);
    document.body.classList.toggle('is-feed-page', path === '/');
    document.body.classList.toggle('is-profile-page', !isEditProfile && (path === '/profile' || path.startsWith('/profile/')));
    document.body.classList.toggle('is-edit-profile-page', isEditProfile);
    document.body.classList.toggle('is-connections-page', path === '/connections');
    document.body.classList.toggle('is-chat-page', path === '/chat');
  };

  const renderNav = (): void => {
    setMobileChromeHidden(false);
    lastScrollY = Math.max(0, window.scrollY);
    clear(navList);
    clear(mobileNav);
    clear(userActionSlot);
    clear(sidebarFooter);

    const currentPath = window.location.pathname;
    const state = authStore.snapshot;
    const location = { pathname: currentPath, search: window.location.search };
    updatePageLayoutState();

    const createNavItem = (entry: NavigationItem): HTMLElement => {
      const link = el('a', {
        className: `sidebar__link ${entry.active ? 'sidebar__link--active' : ''}`,
        attrs: {
          href: entry.href,
          title: entry.label,
          'data-nav-id': entry.id,
          ...(entry.active ? { 'aria-current': 'page' } : {}),
        },
      });
      const iconSpan = el('span', { className: 'sidebar__icon', attrs: { 'aria-hidden': 'true' } });
      iconSpan.append(reactIcon(navigationIcons[entry.icon], { size: 18 }));
      link.append(iconSpan, el('span', { className: 'sidebar__label', text: entry.label }));
      return link;
    };

    const sectionHeadings: Record<string, string> = {
      discover: 'สำรวจ',
      social: 'การเชื่อมต่อ',
      'your-space': 'พื้นที่ของคุณ',
      account: 'บัญชี',
      admin: 'ผู้ดูแลระบบ',
    };

    const sidebarItems = sidebarItemsForState(state, location);
    const sectionOrder: string[] = ['discover', 'social', 'your-space', 'account', 'admin'];
    const grouped = new Map<string, NavigationItem[]>();
    for (const item of sidebarItems) {
      const s = item.section || 'discover';
      if (!grouped.has(s)) grouped.set(s, []);
      grouped.get(s)!.push(item);
    }

    for (const secKey of sectionOrder) {
      const itemsInSec = grouped.get(secKey);
      if (!itemsInSec || itemsInSec.length === 0) continue;
      const groupEl = el('div', { className: 'sidebar__group' });
      const secTitle = el('div', { className: 'sidebar__section-title', text: sectionHeadings[secKey] || secKey });
      groupEl.append(secTitle);
      for (const entry of itemsInSec) {
        groupEl.append(createNavItem(entry));
      }
      navList.append(groupEl);
    }

    const mobileLabels: Record<string, string> = {
      feed: 'หน้าแรก',
      search: 'สำรวจ',
      create: 'สร้าง',
      chat: 'แชท',
      profile: 'โปรไฟล์',
      connections: 'เพื่อน',
      universities: 'สถาบัน',
      'complete-profile': 'โปรไฟล์',
    };
    for (const entry of mobileItemsForState(state, location)) {
      const mobileLink = el('a', {
        className: `mobile-primary-nav__link ${entry.active ? 'mobile-primary-nav__link--active' : ''}`,
        attrs: {
          href: entry.href,
          'aria-label': entry.label,
          'data-nav-id': entry.id,
          ...(entry.active ? { 'aria-current': 'page' } : {}),
        },
      });
      const mobileIcon = el('span', { className: 'mobile-primary-nav__icon', attrs: { 'aria-hidden': 'true' } });
      mobileIcon.append(reactIcon(navigationIcons[entry.icon], { size: 18 }));
      mobileLink.append(
        mobileIcon,
        el('span', { className: 'mobile-primary-nav__label', text: mobileLabels[entry.id] ?? entry.label }),
      );
      mobileNav.append(mobileLink);
    }

    const sidebarAction = sidebarActionForState(state);
    if (sidebarAction) {
      sidebarFooter.append(el('a', {
        className: 'btn-create-project',
        attrs: {
          href: sidebarAction.href,
          'data-action-kind': sidebarAction.href === '/dashboard/posts/new' ? 'create' : 'continue',
        },
        text: sidebarAction.label,
      }));
    }

    const authenticated = state.status === 'authenticated' && Boolean(state.user);
    bellWrap.hidden = !authenticated;
    searchWrap.hidden = !authenticated;
    mobileSearchBtn.hidden = !authenticated;
    if (!authenticated) {
      notifDropdown.style.display = 'none';
      bellBtn.setAttribute('aria-expanded', 'false');
      closeAutocomplete();
    }

    if (state.status === 'loading') return;

    if (state.status === 'authenticated' && state.user) {
      const user = state.user;
      const initial = user.name ? user.name.charAt(0).toUpperCase() : 'ส';
      const menuWrap = el('div', { className: 'account-menu-wrap' });
      const trigger = el('button', {
        className: 'account-menu-trigger',
        attrs: {
          type: 'button',
          'aria-label': `เปิดเมนูบัญชีของ ${user.name}`,
          'aria-haspopup': 'menu',
          'aria-expanded': 'false',
        },
      });

      const createAvatar = (large = false): HTMLElement => {
        const avatar = el('span', {
          className: `account-avatar${large ? ' account-avatar--large' : ''}`,
          text: initial,
          attrs: { 'aria-hidden': 'true' },
        });
        if (user.avatarUrl) {
          const image = el('img', {
            attrs: {
              src: profileImageUrl(user.avatarUrl),
              alt: '',
              loading: 'eager',
              referrerpolicy: 'no-referrer',
            },
          });
          image.addEventListener('error', () => {
            avatar.replaceChildren(document.createTextNode(initial));
          }, { once: true });
          avatar.replaceChildren(image);
        }
        return avatar;
      };

      const triggerIdentity = el('span', { className: 'account-trigger__identity' });
      triggerIdentity.append(
        el('span', { className: 'account-trigger__name', text: user.name }),
        el('span', {
          className: 'account-trigger__meta',
          text: user.username ? `@${user.username}` : user.university,
        }),
      );
      const chevron = el('span', { className: 'account-trigger__chevron', attrs: { 'aria-hidden': 'true' } });
      chevron.append(reactIcon('chevron-down', { size: 14 }));
      trigger.append(createAvatar(), triggerIdentity, chevron);

      const menu = el('div', {
        className: 'account-menu',
        attrs: { role: 'menu', 'aria-label': 'เมนูบัญชี', hidden: '' },
      });

      const profileSummary = el('div', { className: 'account-menu__profile' });
      const profileCopy = el('span', { className: 'account-menu__profile-copy' });
      profileCopy.append(
        el('span', { className: 'account-menu__profile-name', text: user.name }),
        el('span', { className: 'account-menu__profile-email', text: user.email }),
        el('span', { className: 'account-menu__profile-university', text: user.university }),
      );
      profileSummary.append(createAvatar(true), profileCopy);

      const closeMenu = (): void => {
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      };

      const createMenuLink = (
        href: string,
        label: string,
        hint: string,
        iconName: AppIconName,
      ): HTMLAnchorElement => {
        const link = el('a', {
          className: 'account-menu__item',
          attrs: { href, role: 'menuitem' },
        });
        const icon = el('span', { className: 'account-menu__item-icon', attrs: { 'aria-hidden': 'true' } });
        icon.append(reactIcon(iconName, { size: 18 }));
        const copy = el('span', { className: 'account-menu__item-copy' });
        copy.append(
          el('span', { className: 'account-menu__item-label', text: label }),
          el('span', { className: 'account-menu__item-hint', text: hint }),
        );
        link.append(icon, copy);
        link.addEventListener('click', closeMenu);
        return link;
      };

      const items = el('div', { className: 'account-menu__items' });
      items.append(
        createMenuLink('/profile', 'ดูโปรไฟล์', 'ดูหน้าโปรไฟล์และกิจกรรมของคุณ', 'user'),
        createMenuLink('/profile/edit', 'แก้ไขโปรไฟล์', 'เปลี่ยนข้อมูลและรูปโปรไฟล์', 'edit'),
        createMenuLink('/dashboard', 'โพสต์ของฉัน', 'จัดการโพสต์ที่คุณสร้างไว้', 'posts'),
        createMenuLink('/notifications', 'การแจ้งเตือน', 'ดูประวัติการแจ้งเตือนทั้งหมด', 'bell'),
        createMenuLink('/connections', 'เพื่อน & การเชื่อมต่อ', 'ดูรายชื่อเพื่อนและคำขอ', 'connections'),
        createMenuLink('/groups', 'กลุ่มชุมชน', 'ค้นพบและจัดการกลุ่มของคุณ', 'users'),
        createMenuLink('/universities', 'สถาบัน 3 พระจอมฯ', 'ดูชุมชนของแต่ละสถาบัน', 'university'),
        createMenuLink('/?saved=1', 'โพสต์ที่บันทึกไว้', 'ดูโพสต์ที่คุณบันทึกเก็บไว้', 'bookmark'),
      );

      if (user.role === 'admin') {
        items.append(createMenuLink(
          '/admin/moderation',
          'การดูแลระบบ',
          'ตรวจสอบรายงานและจัดการเนื้อหา',
          'shield',
        ));
      }

      const footer = el('div', { className: 'account-menu__items' });
      const logoutBtn = el('button', {
        className: 'account-menu__item account-menu__item--danger',
        attrs: { type: 'button', role: 'menuitem' },
      });
      const logoutIcon = el('span', { className: 'account-menu__item-icon', attrs: { 'aria-hidden': 'true' } });
      logoutIcon.append(reactIcon('logout', { size: 18 }));
      const logoutCopy = el('span', { className: 'account-menu__item-copy' });
      const logoutLabel = el('span', { className: 'account-menu__item-label', text: 'ออกจากระบบ' });
      logoutCopy.append(
        logoutLabel,
        el('span', { className: 'account-menu__item-hint', text: 'สิ้นสุดเซสชันบนอุปกรณ์นี้' }),
      );
      logoutBtn.append(logoutIcon, logoutCopy);

      logoutBtn.addEventListener('click', async () => {
        logoutBtn.disabled = true;
        logoutLabel.textContent = 'กำลังออกจากระบบ...';
        closeMenu();
        try {
          await authApi.logout();
          toast.success('ออกจากระบบสำเร็จ');
        } catch (error) {
          toast.error(errorMessage(error));
        } finally {
          window.history.pushState(null, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      });

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const opening = menu.hidden;
        notifDropdown.style.display = 'none';
      bellBtn.setAttribute('aria-expanded', 'false');
        menu.hidden = !opening;
        trigger.setAttribute('aria-expanded', opening ? 'true' : 'false');
      });

      menu.append(
        profileSummary,
        el('div', { className: 'account-menu__divider', attrs: { 'aria-hidden': 'true' } }),
        items,
        el('div', { className: 'account-menu__divider', attrs: { 'aria-hidden': 'true' } }),
        footer,
      );
      footer.append(logoutBtn);
      menuWrap.append(trigger, menu);
      userActionSlot.append(menuWrap);
      return;
    }

    const loginLink = el('a', {
      className: 'icon-btn',
      attrs: { href: '/login', title: 'เข้าสู่ระบบ', 'aria-label': 'เข้าสู่ระบบ' },
    });
    loginLink.append(reactIcon('user', { size: 19 }));
    loginLink.append(el('span', { className: 'header-action-label', text: 'เข้าสู่ระบบ' }));
    userActionSlot.append(loginLink);
  };

  renderNav();
  authStore.subscribe(renderNav);

  window.addEventListener('popstate', renderNav);
  // Intercept pushState & replaceState for immediate navbar active update
  const origPush = window.history.pushState.bind(window.history);
  window.history.pushState = function (...args) {
    const res = origPush(...args);
    renderNav();
    return res;
  };
  const origReplace = window.history.replaceState.bind(window.history);
  window.history.replaceState = function (...args) {
    const res = origReplace(...args);
    renderNav();
    return res;
  };

  return main;
}

export function bindAuthNavigation(router: Router): void {
  let previous = authStore.snapshot.status;
  authStore.subscribe((state) => {
    if (previous !== state.status) {
      previous = state.status;
      router.refresh();
    }
  });
}

import { authApi } from '../core/auth/auth-api';
import { authStore } from '../core/auth/auth-store';
import { notificationStore } from '../core/notifications/notification-store';
import type { Router } from '../core/router/router';
import { clear, el } from '../core/ui/dom';
import { errorMessage } from '../core/ui/error-message';
import { toast } from '../core/ui/toast';
import { formatRelativeTime } from '../core/utils/format';

const icons = {
  feed: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`,
  connections: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  chats: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  institutions: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  bell: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  user: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
};

export function mountLayout(root: HTMLElement): HTMLElement {
  // Top Header
  const header = el('header', { className: 'site-header' });
  const headerInner = el('div', { className: 'site-header__inner' });

  const brand = el('a', { className: 'brand-title', text: 'KingMongkut Social', attrs: { href: '/' } });

  // Search input in header
  const searchWrap = el('div', { className: 'site-header__search' });
  const searchIcon = el('span', { className: 'site-header__search-icon' });
  searchIcon.innerHTML = icons.search;
  const searchInput = el('input', {
    className: 'search-pill-input',
    attrs: {
      type: 'search',
      placeholder: 'ค้นหาเพื่อน, สถาบัน, โพสต์...',
      'aria-label': 'ค้นหา',
    },
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = searchInput.value.trim();
      const target = q ? `/?search=${encodeURIComponent(q)}` : '/';
      window.history.pushState(null, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });

  searchWrap.append(searchIcon, searchInput);

  // Right Header Actions
  const headerActions = el('div', { className: 'site-header__actions' });

  // Notification Bell & Interactive Dropdown
  const bellWrap = el('div', { className: 'notification-bell-wrap' });
  const bellBtn = el('button', {
    className: 'icon-btn',
    attrs: { type: 'button', 'aria-label': 'การแจ้งเตือน', title: 'การแจ้งเตือน' },
  });
  bellBtn.innerHTML = icons.bell;
  bellBtn.append(el('span', { className: 'header-action-label', text: 'การแจ้งเตือน' }));

  const notifBadge = el('span', { className: 'notification-badge', attrs: { style: 'display: none;' } });

  const notifDropdown = el('div', { className: 'notifications-dropdown', attrs: { style: 'display: none;' } });
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
      const avatar = el('div', { className: 'notification-avatar', text: n.actorInitial });
      const typeBadge = el('span', { className: 'notification-type-badge' });
      if (n.type === 'like') {
        typeBadge.textContent = '❤️';
      } else if (n.type === 'comment') {
        typeBadge.textContent = '💬';
      } else {
        typeBadge.textContent = '↩️';
      }
      avatarWrap.append(avatar, typeBadge);

      // Body
      const body = el('div', { className: 'notification-body' });
      const textLine = el('div', { className: 'notification-text' });
      const actor = el('span', { className: 'notification-actor', text: n.actorName });
      textLine.append(actor);

      let actionDesc = '';
      if (n.type === 'like') actionDesc = ' ถูกใจโพสต์ของคุณ';
      else if (n.type === 'comment') actionDesc = ' ได้แสดงความคิดเห็นบนโพสต์ของคุณ';
      else actionDesc = ' ได้ตอบกลับความคิดเห็นของคุณ';
      textLine.append(document.createTextNode(actionDesc));

      if (n.contentSnippet || n.postSnippet) {
        const snippet = el('span', {
          className: 'notification-snippet',
          text: `“${n.contentSnippet || n.postSnippet}”`,
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

        const scrollToTargetPost = () => {
          const targetCard = document.querySelector(`[data-post-id="${n.postId}"]`) || document.getElementById(`post-${n.postId}`);
          if (targetCard instanceof HTMLElement) {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetCard.classList.remove('feed-post-card--highlighted');
            void targetCard.offsetWidth; // trigger reflow
            targetCard.classList.add('feed-post-card--highlighted');

            // If action was comment or reply, open the comments section
            if (n.type === 'comment' || n.type === 'reply') {
              const commentBtn = targetCard.querySelector<HTMLButtonElement>('.reaction-btn:nth-child(2)');
              const commentsSec = targetCard.querySelector<HTMLElement>('.post-comments-section');
              if (commentsSec && commentsSec.style.display === 'none' && commentBtn) {
                commentBtn.click();
              }
            }
          }
        };

        if (window.location.pathname !== '/') {
          window.history.pushState(null, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
          setTimeout(scrollToTargetPost, 350);
        } else {
          scrollToTargetPost();
        }
      });

      notifList.append(item);
    });
  };

  notificationStore.subscribe(renderNotifications);

  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = notifDropdown.style.display === 'none';
    notifDropdown.style.display = isHidden ? 'block' : 'none';
  });

  document.addEventListener('click', (e) => {
    if (!bellWrap.contains(e.target as Node)) {
      notifDropdown.style.display = 'none';
    }
  });

  bellWrap.append(bellBtn, notifBadge, notifDropdown);
  const userActionSlot = el('div', { className: 'site-header__user-slot' });

  headerActions.append(bellWrap, userActionSlot);
  headerInner.append(brand, searchWrap, headerActions);
  header.append(headerInner);


  // App Layout Shell
  const appLayout = el('div', { className: 'app-layout' });
  const sidebar = el('aside', { className: 'app-sidebar' });
  const sidebarTop = el('div', { className: 'sidebar__top' });

  const navTitle = el('div', { className: 'sidebar__section-title', text: 'เมนูหลัก' });
  const navSubtitle = el('div', { className: 'sidebar__subtitle', text: 'เครือข่ายนักศึกษา 3 พระจอมฯ' });
  const navList = el('nav', { className: 'sidebar__nav' });

  sidebarTop.append(navTitle, navSubtitle, navList);

  const sidebarFooter = el('div', { className: 'sidebar__footer' });
  const createProjectBtn = el('a', {
    className: 'btn-create-project',
    attrs: { href: '/dashboard/posts/new' },
    text: '+ สร้างโปรเจกต์ใหม่',
  });
  sidebarFooter.append(createProjectBtn);

  sidebar.append(sidebarTop, sidebarFooter);

  const main = el('main', { className: 'app-content', attrs: { id: 'main-content' } });
  appLayout.append(sidebar, main);

  const mobileNav = el('nav', { className: 'mobile-primary-nav', attrs: { 'aria-label': 'เมนูหลักบนมือถือ' } });
  root.replaceChildren(header, mobileNav, appLayout);

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
    clear(navList);
    clear(mobileNav);
    clear(userActionSlot);

    const currentPath = window.location.pathname;
    const savedOnly = new URLSearchParams(window.location.search).get('saved') === '1';
    updatePageLayoutState();

    const createNavItem = (label: string, href: string, iconSvg: string, isActive: boolean): HTMLElement => {
      const link = el('a', {
        className: `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`,
        attrs: { href },
      });
      const iconSpan = el('span', { className: 'sidebar__icon' });
      iconSpan.innerHTML = iconSvg;
      const textSpan = el('span', { text: label });
      link.append(iconSpan, textSpan);
      return link;
    };

    const isProfilePage = currentPath === '/profile' || (currentPath.startsWith('/profile/') && currentPath !== '/profile/edit');
    const isCompactSocialPage = isProfilePage || currentPath === '/connections' || currentPath === '/chat';
    if (isCompactSocialPage) {
      const unavailable = (label: string): HTMLElement => el('span', {
        className: 'sidebar__link sidebar__link--unavailable',
        text: label,
        attrs: { 'aria-disabled': 'true' },
      });
      const notificationsLink = el('button', {
        className: 'sidebar__link sidebar__link--button',
        text: 'การแจ้งเตือน',
        attrs: { type: 'button' },
      });
      notificationsLink.addEventListener('click', () => bellBtn.click());
      navList.append(
        createNavItem('ฟีดข่าว', '/', icons.feed, false),
        createNavItem('เพื่อน & การเชื่อมต่อ', '/connections', icons.connections, currentPath === '/connections'),
        createNavItem('ข้อความ', '/chat', icons.chats, currentPath === '/chat'),
        notificationsLink,
        unavailable('สถาบัน'),
        createNavItem('สำรวจ', '/connections', icons.search, false),
        unavailable('กลุ่ม'),
        createNavItem('บันทึกไว้', '/?saved=1', icons.feed, false),
        authStore.snapshot.status === 'authenticated'
          ? createNavItem('ตั้งค่า', '/profile/edit', icons.user, false)
          : unavailable('ตั้งค่า'),
      );
    } else {
      navList.append(
        createNavItem('ฟีดข่าว', '/', icons.feed, (currentPath === '/' && !savedOnly) || currentPath.startsWith('/posts')),
        createNavItem('เพื่อน & การเชื่อมต่อ', '/connections', icons.connections, currentPath === '/connections'),
        createNavItem('แชท', '/chat', icons.chats, currentPath === '/chat'),
        createNavItem('สถาบัน', '#', icons.institutions, false),
      );
    }

    for (const [label, href, active] of [
      ['ฟีด', '/', currentPath === '/' || currentPath.startsWith('/posts')],
      ['เพื่อน', '/connections', currentPath === '/connections'],
      ['แชท', '/chat', currentPath === '/chat'],
    ] as const) {
      mobileNav.append(el('a', {
        className: `mobile-primary-nav__link ${active ? 'mobile-primary-nav__link--active' : ''}`,
        text: label,
        attrs: { href, 'aria-current': active ? 'page' : 'false' },
      }));
    }

    const state = authStore.snapshot;
    if (state.status === 'authenticated' && state.user) {
      if (!isCompactSocialPage) {
        navList.append(
          createNavItem('บันทึกไว้', '/?saved=1', icons.feed, currentPath === '/' && savedOnly),
          createNavItem('โพสต์ของฉัน', '/dashboard', icons.feed, currentPath.startsWith('/dashboard')),
        );
      }

      const initial = state.user.name ? state.user.name.charAt(0).toUpperCase() : 'ส';
      const userBtn = el('a', {
        className: 'user-avatar-btn',
        attrs: { href: '/profile', title: `โปรไฟล์: ${state.user.name} (${state.user.email})` },
        text: initial,
      });
      userBtn.append(el('span', { className: 'header-user-label', text: state.user.name }));


      const logoutBtn = el('button', {
        className: 'icon-btn',
        attrs: { type: 'button', 'aria-label': 'ออกจากระบบ', title: 'ออกจากระบบ' },
      });
      logoutBtn.innerHTML = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
      logoutBtn.addEventListener('click', async () => {
        try {
          await authApi.logout();
          toast.success('ออกจากระบบสำเร็จ');
          window.history.pushState(null, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (error) {
          toast.error(errorMessage(error));
        }
      });

      userActionSlot.append(userBtn, logoutBtn);
    } else {
      const loginLink = el('a', {
        className: 'icon-btn',
        attrs: { href: '/login', title: 'เข้าสู่ระบบ' },
      });
      loginLink.innerHTML = icons.user;
      userActionSlot.append(loginLink);
    }
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

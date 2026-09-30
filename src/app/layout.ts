import { authApi } from '../core/auth/auth-api';
import { authStore } from '../core/auth/auth-store';
import { notificationStore } from '../core/notifications/notification-store';
import type { Router } from '../core/router/router';
import { mobileItemsForState, sidebarActionForState, sidebarItemsForState, type NavigationItem } from './navigation';
import { clear, el } from '../core/ui/dom';
import { errorMessage } from '../core/ui/error-message';
import { toast } from '../core/ui/toast';
import { formatRelativeTime } from '../core/utils/format';
import { profileImageUrl } from '../modules/profile/profile-api';

const icons = {
  feed: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`,
  connections: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  chats: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  institutions: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  bell: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  user: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
};

const accountIcons = {
  profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  posts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
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
      const target = q ? `/search?q=${encodeURIComponent(q)}` : '/search';
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
      if (n.type === 'post_reaction') typeBadge.textContent = '❤️';
      else if (n.type === 'post_comment') typeBadge.textContent = '💬';
      else if (n.type === 'comment_reply') typeBadge.textContent = '↩️';
      else if (n.type === 'friend_request') typeBadge.textContent = '👤';
      else if (n.type === 'friend_accept') typeBadge.textContent = '🤝';
      else typeBadge.textContent = '👥';
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
        let target = '/';
        if (n.type === 'post_reaction' || n.type === 'post_comment' || n.type === 'comment_reply') {
          target = n.postId ? `/posts/${encodeURIComponent(n.postId)}` : '/';
        } else if (n.type === 'friend_request' || n.type === 'friend_accept') {
          target = '/connections';
        } else if (n.type === 'group_invite') {
          target = '/groups';
        } else if (n.type === 'group_join') {
          target = n.postId ? `/groups/${encodeURIComponent(n.postId)}` : '/groups';
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
  });

  document.addEventListener('click', (e) => {
    if (!bellWrap.contains(e.target as Node)) {
      notifDropdown.style.display = 'none';
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
    notifDropdown.style.display = 'none';
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
  const navList = el('nav', { className: 'sidebar__nav' });

  sidebarTop.append(navTitle, navSubtitle, navList);

  const sidebarFooter = el('div', { className: 'sidebar__footer' });

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
          ...(entry.active ? { 'aria-current': 'page' } : {}),
        },
      });
      const iconSpan = el('span', { className: 'sidebar__icon' });
      iconSpan.innerHTML = icons[entry.icon];
      link.append(iconSpan, el('span', { text: entry.label }));
      return link;
    };

    for (const entry of sidebarItemsForState(state, location)) {
      navList.append(createNavItem(entry));
    }

    const mobileLabels: Record<string, string> = {
      feed: 'ฟีด',
      connections: 'เพื่อน',
      chat: 'แชท',
      profile: 'โปรไฟล์',
      search: 'สำรวจ',
      universities: 'สถาบัน',
      'complete-profile': 'โปรไฟล์',
    };
    for (const entry of mobileItemsForState(state, location)) {
      mobileNav.append(el('a', {
        className: `mobile-primary-nav__link ${entry.active ? 'mobile-primary-nav__link--active' : ''}`,
        text: mobileLabels[entry.id] ?? entry.label,
        attrs: {
          href: entry.href,
          ...(entry.active ? { 'aria-current': 'page' } : {}),
        },
      }));
    }

    const sidebarAction = sidebarActionForState(state);
    if (sidebarAction) {
      sidebarFooter.append(el('a', {
        className: 'btn-create-project',
        attrs: { href: sidebarAction.href },
        text: sidebarAction.label,
      }));
    }

    const authenticated = state.status === 'authenticated' && Boolean(state.user);
    bellWrap.hidden = !authenticated;
    if (!authenticated) {
      notifDropdown.style.display = 'none';
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
      chevron.innerHTML = accountIcons.chevron;
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
        iconSvg: string,
      ): HTMLAnchorElement => {
        const link = el('a', {
          className: 'account-menu__item',
          attrs: { href, role: 'menuitem' },
        }) as HTMLAnchorElement;
        const icon = el('span', { className: 'account-menu__item-icon', attrs: { 'aria-hidden': 'true' } });
        icon.innerHTML = iconSvg;
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
        createMenuLink('/profile', 'ดูโปรไฟล์', 'ดูหน้าโปรไฟล์และกิจกรรมของคุณ', accountIcons.profile),
        createMenuLink('/profile/edit', 'แก้ไขโปรไฟล์', 'เปลี่ยนข้อมูลและรูปโปรไฟล์', accountIcons.edit),
        createMenuLink('/dashboard', 'โพสต์ของฉัน', 'จัดการโพสต์ที่คุณสร้างไว้', accountIcons.posts),
      );

      if (user.role === 'admin') {
        items.append(createMenuLink(
          '/admin/moderation',
          'การดูแลระบบ',
          'ตรวจสอบรายงานและจัดการเนื้อหา',
          accountIcons.shield,
        ));
      }

      const footer = el('div', { className: 'account-menu__items' });
      const logoutBtn = el('button', {
        className: 'account-menu__item account-menu__item--danger',
        attrs: { type: 'button', role: 'menuitem' },
      });
      const logoutIcon = el('span', { className: 'account-menu__item-icon', attrs: { 'aria-hidden': 'true' } });
      logoutIcon.innerHTML = accountIcons.logout;
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
    loginLink.innerHTML = icons.user;
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

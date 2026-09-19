import { authApi } from '../core/auth/auth-api';
import { authStore } from '../core/auth/auth-store';
import type { Router } from '../core/router/router';
import { clear, el } from '../core/ui/dom';
import { errorMessage } from '../core/ui/error-message';
import { toast } from '../core/ui/toast';

function avatar(name: string, image?: string | null): HTMLElement {
  const wrapper = el('span', { className: 'avatar avatar--small' });
  if (image) {
    const img = el('img', { attrs: { src: image, alt: '' } });
    wrapper.append(img);
  } else {
    wrapper.textContent = name.trim().charAt(0).toUpperCase() || '?';
  }
  return wrapper;
}

export function mountLayout(root: HTMLElement): HTMLElement {
  const header = el('header', { className: 'site-header' });
  const brand = el('a', { className: 'brand', attrs: { href: '/' } },
    el('span', { className: 'brand__mark', text: '✣' }),
    el('span', { className: 'brand__text', text: '3K book' }),
  );

  const search = el('form', { className: 'top-search', attrs: { role: 'search' } });
  const searchInput = el('input', {
    attrs: {
      type: 'search',
      name: 'search',
      placeholder: 'Search...',
      'aria-label': 'Search posts',
      maxlength: '100',
    },
  });
  search.append(el('span', { className: 'top-search__icon', text: '⌕' }), searchInput);
  search.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = new URLSearchParams();
    const value = searchInput.value.trim();
    if (value) query.set('search', value);
    window.history.pushState(null, '', query.size ? `/?${query.toString()}` : '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  const headerActions = el('nav', { className: 'header-actions', attrs: { 'aria-label': 'Account navigation' } });
  header.append(el('div', { className: 'site-header__inner' }, brand, search, headerActions));

  const sidebar = el('aside', { className: 'sidebar' });
  const sidebarNav = el('nav', { className: 'sidebar-nav', attrs: { 'aria-label': 'Main navigation' } });
  sidebar.append(
    el('div', { className: 'sidebar__heading' },
      el('span', { text: 'NAVIGATION' }),
      el('small', { text: 'Academic Social Network' }),
    ),
    sidebarNav,
  );

  const main = el('main', { className: 'main', attrs: { id: 'main-content' } });
  const appFrame = el('div', { className: 'app-frame' }, sidebar, main);
  const footer = el('footer', { className: 'footer' },
    el('span', { text: 'Privacy Policy' }),
    el('span', { text: '•' }),
    el('span', { text: 'Terms of Service' }),
    el('span', { text: '•' }),
    el('span', { text: 'Contact Support' }),
  );

  root.replaceChildren(header, appFrame, footer);

  const renderNavigation = (): void => {
    clear(sidebarNav);
    clear(headerActions);
    const state = authStore.snapshot;

    if (state.status === 'authenticated' && state.user) {
      sidebarNav.append(
        el('a', { className: 'sidebar-link', attrs: { href: '/' } },
          el('span', { text: '▤' }), el('span', { text: 'Home Feed' })),
        el('a', { className: 'sidebar-link', attrs: { href: '/connections' } },
          el('span', { text: '♧' }), el('span', { text: 'Connections' })),
        el('a', { className: 'sidebar-link', attrs: { href: '/dashboard' } },
          el('span', { text: '▱' }), el('span', { text: 'My Posts' })),
        el('div', { className: 'sidebar-institution' },
          el('span', { className: `uni-dot uni-dot--${state.user.university.toLowerCase()}` }),
          el('span', { text: state.user.university })),
        el('a', {
          className: 'button button--primary sidebar-create',
          text: '+ Create Post',
          attrs: { href: '/dashboard/posts/new' },
        }),
      );

      headerActions.append(
        el('span', { className: 'header-icon', text: '♢', attrs: { title: 'Notifications', 'aria-hidden': 'true' } }),
        avatar(state.user.name, state.user.avatarUrl),
        el('span', { className: 'header-user', text: state.user.name }),
      );

      const logout = el('button', {
        className: 'header-logout',
        text: 'Sign out',
        attrs: { type: 'button' },
      });
      logout.addEventListener('click', async () => {
        logout.disabled = true;
        try {
          await authApi.logout();
          window.history.pushState(null, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (error) {
          toast.error(errorMessage(error));
          logout.disabled = false;
        }
      });
      headerActions.append(logout);
    }
  };

  renderNavigation();
  authStore.subscribe(renderNavigation);
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

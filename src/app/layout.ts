import { authApi } from '../core/auth/auth-api';
import { authStore } from '../core/auth/auth-store';
import type { Router } from '../core/router/router';
import { clear, el } from '../core/ui/dom';
import { errorMessage } from '../core/ui/error-message';
import { toast } from '../core/ui/toast';

export function mountLayout(root: HTMLElement): HTMLElement {
  const header = el('header', { className: 'site-header' });
  const headerInner = el('div', { className: 'site-header__inner container' });
  const brand = el('a', { className: 'brand', attrs: { href: '/' } },
    el('span', { className: 'brand__mark', text: 'KM' }),
    el('span', { className: 'brand__text', text: 'King Mongkut Social' }),
  );
  const nav = el('nav', { className: 'nav', attrs: { 'aria-label': 'Primary navigation' } });
  headerInner.append(brand, nav);
  header.append(headerInner);

  const main = el('main', { className: 'main', attrs: { id: 'main-content' } });
  const footer = el('footer', { className: 'footer' },
    el('div', { className: 'container footer__inner' },
      el('p', { text: `King Mongkut Social · ${new Date().getFullYear()}` }),
      el('p', { className: 'muted', text: 'Vite + TypeScript · tokens kept in memory' }),
    ),
  );

  root.replaceChildren(header, main, footer);

  const renderNav = (): void => {
    clear(nav);
    nav.append(el('a', { className: 'nav__link', text: 'Posts', attrs: { href: '/' } }));

    const state = authStore.snapshot;
    if (state.status === 'authenticated' && state.user) {
      nav.append(
        el('a', { className: 'nav__link', text: 'My posts', attrs: { href: '/dashboard' } }),
        el('a', { className: 'button button--small button--primary', text: 'New post', attrs: { href: '/dashboard/posts/new' } }),
        el('span', { className: 'user-chip', text: state.user.name, attrs: { title: state.user.email } }),
      );
      const logout = el('button', { className: 'button button--small button--ghost', text: 'Logout', attrs: { type: 'button' } });
      logout.addEventListener('click', async () => {
        logout.disabled = true;
        try {
          await authApi.logout();
          toast.success('Signed out');
          window.history.pushState(null, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (error) {
          toast.error(errorMessage(error));
          logout.disabled = false;
        }
      });
      nav.append(logout);
    } else if (state.status === 'anonymous') {
      nav.append(
        el('a', { className: 'nav__link', text: 'Login', attrs: { href: '/login' } }),
        el('a', { className: 'button button--small button--primary', text: 'Create account', attrs: { href: '/register' } }),
      );
    }
  };

  renderNav();
  authStore.subscribe(renderNav);
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

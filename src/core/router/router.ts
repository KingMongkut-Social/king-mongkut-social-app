import { authStore } from '../auth/auth-store';
import { el } from '../ui/dom';
import { errorMessage } from '../ui/error-message';

export interface RouteContext {
  params: Record<string, string>;
  query: URLSearchParams;
  url: URL;
}

export interface PageView {
  element: HTMLElement;
  title: string;
}

export interface RouteDefinition {
  path: string;
  handler: (context: RouteContext) => PageView | Promise<PageView>;
  auth?: 'required' | 'guest';
}

interface CompiledRoute extends RouteDefinition {
  regex: RegExp;
  keys: string[];
}

function compileRoute(route: RouteDefinition): CompiledRoute {
  const keys: string[] = [];
  const escaped = route.path
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
    })
    .join('/');

  return { ...route, regex: new RegExp(`^${escaped}/?$`), keys };
}

export class Router {
  private readonly routes: CompiledRoute[];
  private navigationId = 0;

  constructor(
    private readonly outlet: HTMLElement,
    routes: RouteDefinition[],
  ) {
    this.routes = routes.map(compileRoute);
  }

  start(): void {
    window.addEventListener('popstate', () => void this.render());
    document.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      if (event instanceof MouseEvent && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      this.navigate(`${url.pathname}${url.search}${url.hash}`);
    });

    void this.render();
  }

  navigate(path: string, replace = false): void {
    if (replace) window.history.replaceState(null, '', path);
    else window.history.pushState(null, '', path);
    void this.render();
  }

  refresh(): void {
    void this.render();
  }

  private async render(): Promise<void> {
    const currentNavigation = ++this.navigationId;
    const url = new URL(window.location.href);
    const match = this.match(url.pathname);

    if (!match) {
      document.body.classList.remove('is-auth-page');
      this.commit(currentNavigation, { title: 'Not found', element: this.notFound() });
      return;
    }

    document.body.classList.toggle('is-auth-page', match.route.auth === 'guest');

    const auth = authStore.snapshot;
    if (match.route.auth === 'required' && auth.status !== 'authenticated') {
      const returnTo = encodeURIComponent(`${url.pathname}${url.search}`);
      this.navigate(`/login?returnTo=${returnTo}`, true);
      return;
    }
    if (match.route.auth === 'guest' && auth.status === 'authenticated') {
      this.navigate('/', true);
      return;
    }

    this.outlet.replaceChildren(this.loading());

    try {
      const page = await match.route.handler({
        params: match.params,
        query: url.searchParams,
        url,
      });
      this.commit(currentNavigation, page);
    } catch (error) {
      this.commit(currentNavigation, { title: 'Error', element: this.errorView(error) });
    }
  }

  private commit(navigationId: number, page: PageView): void {
    if (navigationId !== this.navigationId) return;
    document.title = `${page.title} · KingMongkut Social`;
    this.outlet.replaceChildren(page.element);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  private match(pathname: string): { route: CompiledRoute; params: Record<string, string> } | null {
    for (const route of this.routes) {
      const result = route.regex.exec(pathname);
      if (!result) continue;
      const params: Record<string, string> = {};
      route.keys.forEach((key, index) => {
        const raw = result[index + 1];
        if (raw) params[key] = decodeURIComponent(raw);
      });
      return { route, params };
    }
    return null;
  }

  private loading(): HTMLElement {
    return el('div', { className: 'page-shell page-shell--center' },
      el('div', { className: 'loader', attrs: { 'aria-label': 'Loading' } }),
    );
  }

  private notFound(): HTMLElement {
    return el('section', { className: 'empty-state page-shell' },
      el('p', { className: 'eyebrow', text: '404' }),
      el('h1', { text: 'Page not found' }),
      el('p', { text: 'The page you requested does not exist or has moved.' }),
      el('a', { className: 'button button--primary', text: 'Back to feed', attrs: { href: '/' } }),
    );
  }

  private errorView(error: unknown): HTMLElement {
    const retry = el('button', { className: 'button button--primary', text: 'Try again', attrs: { type: 'button' } });
    retry.addEventListener('click', () => this.refresh());
    return el('section', { className: 'empty-state page-shell' },
      el('p', { className: 'eyebrow', text: 'Request failed' }),
      el('h1', { text: 'We could not load this page' }),
      el('p', { text: errorMessage(error) }),
      retry,
    );
  }
}

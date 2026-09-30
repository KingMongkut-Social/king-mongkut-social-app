// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../src/core/auth/auth-store';
import { Router } from '../src/core/router/router';
import type { User } from '../src/types/api';

const user: User = {
  _id: 'member',
  name: 'Student',
  email: 'student@kmitl.ac.th',
  role: 'user',
  university: 'KMITL',
  needsProfileCompletion: false,
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  authStore.setAnonymous();
  window.history.replaceState(null, '', '/');
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('route authorization', () => {
  it('does not render admin routes for regular members', async () => {
    const outlet = document.createElement('main');
    const handler = vi.fn(() => ({
      title: 'Admin',
      element: document.createElement('div'),
    }));
    const router = new Router(outlet, [
      { path: '/admin', handler, auth: 'required', role: 'admin' },
    ]);

    authStore.setAuthenticated(user, 'token');
    router.navigate('/admin');

    await vi.waitFor(() => expect(outlet.textContent).toContain('ไม่มีสิทธิ์เข้าถึงหน้านี้'));
    expect(handler).not.toHaveBeenCalled();
    expect(document.title).toContain('ไม่มีสิทธิ์เข้าถึง');
  });

  it('allows administrators to render admin routes', async () => {
    const outlet = document.createElement('main');
    const element = document.createElement('div');
    element.textContent = 'moderation';
    const handler = vi.fn(() => ({ title: 'Admin', element }));
    const router = new Router(outlet, [
      { path: '/admin', handler, auth: 'required', role: 'admin' },
    ]);

    authStore.setAuthenticated({ ...user, role: 'admin' }, 'token');
    router.navigate('/admin');

    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce());
    expect(outlet.textContent).toBe('moderation');
  });

  it('redirects unauthenticated guests from auth: required routes to /login with returnTo', async () => {
    const outlet = document.createElement('main');
    const homeHandler = vi.fn(() => ({
      title: 'Home',
      element: document.createElement('div'),
    }));
    const loginHandler = vi.fn(() => ({
      title: 'Login',
      element: document.createElement('div'),
    }));
    const router = new Router(outlet, [
      { path: '/', handler: homeHandler, auth: 'required' },
      { path: '/login', handler: loginHandler, auth: 'guest' },
    ]);

    router.navigate('/');

    await vi.waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(window.location.search).toBe('?returnTo=%2F');
    expect(homeHandler).not.toHaveBeenCalled();
    expect(loginHandler).toHaveBeenCalledOnce();
  });

  it('allows authenticated users to access auth: required routes', async () => {
    const outlet = document.createElement('main');
    const homeHandler = vi.fn(() => ({
      title: 'Home Feed',
      element: document.createElement('div'),
    }));
    const router = new Router(outlet, [
      { path: '/', handler: homeHandler, auth: 'required' },
      { path: '/login', handler: vi.fn(), auth: 'guest' },
    ]);

    authStore.setAuthenticated(user, 'token');
    router.navigate('/');

    await vi.waitFor(() => expect(homeHandler).toHaveBeenCalledOnce());
    expect(window.location.pathname).toBe('/');
  });

  it('redirects authenticated users away from auth: guest routes to returnTo or dashboard', async () => {
    const outlet = document.createElement('main');
    const loginHandler = vi.fn(() => ({
      title: 'Login',
      element: document.createElement('div'),
    }));
    const router = new Router(outlet, [
      { path: '/', handler: vi.fn(), auth: 'required' },
      { path: '/login', handler: loginHandler, auth: 'guest' },
    ]);

    authStore.setAuthenticated(user, 'token');
    router.navigate('/login?returnTo=%2F');

    await vi.waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(loginHandler).not.toHaveBeenCalled();
  });
});

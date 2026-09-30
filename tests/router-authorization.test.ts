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
});

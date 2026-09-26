// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../src/core/auth/auth-api';
import { authStore } from '../src/core/auth/auth-store';
import { apiClient } from '../src/core/api/api-client';
import { safeReturnTo } from '../src/core/auth/return-to';
import { requireMember } from '../src/core/auth/auth-navigation';
import { Router, type RouteContext } from '../src/core/router/router';
import { loginPage } from '../src/modules/auth/login-page';
import { registerPage } from '../src/modules/auth/register-page';
import { callbackPage } from '../src/modules/auth/callback-page';
import { completeProfilePage } from '../src/modules/auth/complete-profile-page';
import { postCard } from '../src/modules/posts/post-components';
import type { User } from '../src/types/api';

const user: User = {
  _id: 'member-id', name: 'Student', email: 'student@mail.kmutt.ac.th', role: 'user',
  university: 'KMUTT', needsProfileCompletion: true, createdAt: '', updatedAt: '',
};
function context(path: string): RouteContext {
  const url = new URL(path, 'http://localhost:3000');
  return { url, params: {}, query: url.searchParams };
}
function mountProfile() {
  authStore.setAuthenticated({ ...user }, 'access-token');
  const page = completeProfilePage(context('/complete-profile?returnTo=%2Fconnections'));
  document.body.replaceChildren(page.element);
  return {
    form: page.element.querySelector('form')!,
    faculty: page.element.querySelector<HTMLInputElement>('#faculty')!,
    department: page.element.querySelector<HTMLInputElement>('#department')!,
    submit: page.element.querySelector<HTMLButtonElement>('button[type=submit]')!,
  };
}

beforeEach(() => {
  authStore.setAnonymous();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('CSS', { escape: (value: string) => value });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('Google entry pages and callback', () => {
  it.each([loginPage, registerPage])('offers a single Google action with the three allowed domains', (render) => {
    const start = vi.spyOn(authApi, 'startGoogleLogin').mockImplementation(() => undefined);
    const page = render(context('/login?returnTo=%2Fconnections'));
    expect(page.element.querySelector('input[type=password]')).toBeNull();
    for (const domain of ['@kmitl.ac.th', '@mail.kmutt.ac.th', '@email.kmutnb.ac.th']) {
      expect(page.element.textContent).toContain(domain);
    }
    page.element.querySelector<HTMLButtonElement>('.google-sign-in')!.click();
    expect(start).toHaveBeenCalledWith('/connections');
  });

  it('renders safe Thai errors and allows retry with another account', () => {
    const page = loginPage(context('/login?error=UNIVERSITY_EMAIL_REQUIRED'));
    expect(page.element.querySelector('[role=alert]')?.textContent).toContain('กรุณาเลือกบัญชี');
    expect(page.element.querySelector<HTMLButtonElement>('button')!.disabled).toBe(false);
    const unknown = loginPage(context('/login?error=%3Cscript%3Ealert(1)%3C%2Fscript%3E'));
    expect(unknown.element.querySelector('script')).toBeNull();
    expect(unknown.element.textContent).not.toContain('alert(1)');
  });

  it('routes restored sessions through profile completion and preserves returnTo', () => {
    authStore.setAuthenticated(user, 'access');
    expect(callbackPage(context('/auth/callback?returnTo=%2Fconnections')).redirectTo)
      .toBe('/complete-profile?returnTo=%2Fconnections');
    authStore.setAuthenticated({ ...user, needsProfileCompletion: false }, 'access');
    expect(callbackPage(context('/auth/callback?returnTo=%2Fconnections')).redirectTo).toBe('/connections');
    authStore.setAnonymous();
    expect(callbackPage(context('/auth/callback')).redirectTo).toContain('GOOGLE_SESSION_FAILED');
  });
});

describe('persistent profile onboarding', () => {
  it('does not treat legacy localStorage profile fields as saved data', () => {
    localStorage.setItem('mock_profile_member-id', JSON.stringify({ faculty: 'Fake', department: 'Fake' }));
    authStore.setAuthenticated(user, 'access');
    expect(authStore.snapshot.user?.faculty).toBeUndefined();
    expect(authStore.snapshot.user?.needsProfileCompletion).toBe(true);
  });

  it('renders API author profiles even if stale browser metadata exists', () => {
    localStorage.setItem('mock_profile_author-id', JSON.stringify({ faculty: 'Fake Faculty', department: 'Fake Department' }));
    localStorage.setItem('post_meta_post-id', JSON.stringify({ faculty: 'Fake Faculty', department: 'Fake Department' }));
    authStore.setAuthenticated({ ...user, name: 'Same Name', faculty: 'My Faculty', department: 'My Department' }, 'access');
    const card = postCard({
      _id: 'post-id', title: 'Test', content: 'Test', status: 'published', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      user: { _id: 'author-id', name: 'Same Name', university: 'KMITL', faculty: 'Real Faculty', department: 'Real Department' },
    });
    expect(card.querySelector('.post-dept-line')?.textContent).toContain('Real Faculty');
    expect(card.querySelector('.post-dept-line')?.textContent).toContain('Real Department');
    expect(card.querySelector('.post-dept-line')?.textContent).not.toContain('Fake');
    expect(card.querySelector('.post-dept-line')?.textContent).not.toContain('My Faculty');
  });

  it('requires both fields without sending an invalid request', () => {
    const update = vi.spyOn(authApi, 'updateProfile');
    const { form, faculty, department } = mountProfile();
    faculty.value = ' ';
    department.value = '';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(update).not.toHaveBeenCalled();
    expect(form.querySelector('#faculty-error')?.textContent).toBe('กรุณากรอกคณะ');
    expect(form.querySelector('#department-error')?.textContent).toBe('กรุณากรอกภาควิชา');
  });

  it('saves to the API, updates identity state and restores the profile after reload', async () => {
    const completed = { ...user, faculty: 'Engineering', department: 'Computer', needsProfileCompletion: false };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ success: true, data: { user: completed } }))
      .mockResolvedValueOnce(Response.json({ success: true, data: { user: completed, accessToken: 'restored-token' } }));
    vi.stubGlobal('fetch', fetchMock);
    const { form, faculty, department, submit } = mountProfile();
    expect(form.parentElement?.textContent).toContain('student@mail.kmutt.ac.th');
    expect(form.querySelector('input[name=email]')).toBeNull();
    faculty.value = ' Engineering ';
    department.value = ' Computer ';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(submit.disabled).toBe(true);
    await vi.waitFor(() => expect(window.location.pathname).toBe('/connections'));
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ faculty: 'Engineering', department: 'Computer' }));
    expect(authStore.snapshot.user?.needsProfileCompletion).toBe(false);
    authStore.setAnonymous();
    await apiClient.restoreSession();
    expect(authStore.snapshot.user?.faculty).toBe('Engineering');
    expect(authStore.snapshot.accessToken).toBe('restored-token');
    expect(localStorage.getItem('mock_profile_member-id')).toBeNull();
  });

  it('retains entered values and allows retry on save failure', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')));
    const { form, faculty, department, submit } = mountProfile();
    faculty.value = 'Engineering'; department.value = 'Computer';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(submit.disabled).toBe(false));
    expect(faculty.value).toBe('Engineering');
    expect(department.value).toBe('Computer');
    expect(form.querySelector('[role=alert]')?.textContent).toContain('เชื่อมต่อระบบไม่สำเร็จ');
    expect(authStore.snapshot.user?.needsProfileCompletion).toBe(true);
  });

  it('clears authentication on logout and sends cookies', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    authStore.setAuthenticated(user, 'access');
    await authApi.logout();
    expect(authStore.snapshot.status).toBe('anonymous');
    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('include');
  });
});

describe('routing and membership restrictions', () => {
  it('blocks private routes and member actions while allowing public reading', async () => {
    const outlet = document.createElement('div');
    const privateHandler = vi.fn(() => ({ title: 'Private', element: document.createElement('div') }));
    const router = new Router(outlet, [
      { path: '/', handler: () => ({ title: 'Public', element: document.createElement('div') }) },
      { path: '/login', handler: loginPage, auth: 'guest' },
      { path: '/dashboard', handler: privateHandler, auth: 'required' },
      { path: '/complete-profile', handler: completeProfilePage, auth: 'required', incompleteProfileAllowed: true },
    ]);
    router.navigate('/dashboard');
    expect(window.location.pathname).toBe('/login');
    authStore.setAuthenticated(user, 'access');
    router.navigate('/dashboard');
    expect(window.location.pathname).toBe('/complete-profile');
    expect(privateHandler).not.toHaveBeenCalled();
    router.navigate('/');
    await vi.waitFor(() => expect(document.title).toContain('Public'));
    expect(requireMember()).toBe(false);
    expect(window.location.pathname).toBe('/complete-profile');
    authStore.setAuthenticated({ ...user, needsProfileCompletion: false }, 'access');
    router.navigate('/dashboard');
    await vi.waitFor(() => expect(privateHandler).toHaveBeenCalledOnce());
    expect(requireMember()).toBe(true);
  });

  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/%2f%2fevil.test', '/%5cevil.test',
    '/login', '/register', '/auth/callback', '/complete-profile', '/x/../login', '/%6cogin', '/bad%'])('rejects unsafe return paths %s', (value) => { expect(safeReturnTo(value)).toBe('/dashboard'); });
});

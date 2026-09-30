import { describe, expect, it } from 'vitest';
import {
  mobileItemsForState,
  sidebarActionForState,
  sidebarItemsForState,
} from '../src/app/navigation';
import type { AuthState } from '../src/core/auth/auth-store';
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

const location = (pathname: string, search = '') => ({ pathname, search });
const ids = (state: AuthState, pathname = '/', search = '') =>
  sidebarItemsForState(state, location(pathname, search)).map((entry) => entry.id);

describe('auth-aware sidebar navigation', () => {
  it('keeps member-only destinations out of the guest sidebar', () => {
    const state: AuthState = { status: 'anonymous', user: null, accessToken: null };
    expect(ids(state)).toEqual(['feed', 'universities', 'groups', 'search']);
    expect(sidebarActionForState(state)).toEqual({ label: 'เข้าสู่ระบบ', href: '/login' });
    expect(mobileItemsForState(state, location('/')).map((entry) => entry.id))
      .toEqual(['feed', 'universities', 'search']);
  });

  it('does not render an auth action while session restoration is loading', () => {
    const state: AuthState = { status: 'loading', user: null, accessToken: null };
    expect(sidebarActionForState(state)).toBeNull();
  });

  it('gates incomplete members to profile completion instead of private destinations', () => {
    const state: AuthState = {
      status: 'authenticated',
      user: { ...user, needsProfileCompletion: true },
      accessToken: 'token',
    };
    expect(ids(state)).toEqual([
      'feed',
      'universities',
      'groups',
      'search',
      'complete-profile',
    ]);
    expect(sidebarActionForState(state))
      .toEqual({ label: 'กรอกโปรไฟล์ให้เสร็จ', href: '/complete-profile' });
    expect(mobileItemsForState(state, location('/complete-profile')).map((entry) => entry.id))
      .toEqual(['feed', 'search', 'complete-profile']);
  });

  it('shows the complete member navigation and marks saved/dashboard routes correctly', () => {
    const state: AuthState = { status: 'authenticated', user, accessToken: 'token' };
    expect(ids(state)).toEqual([
      'feed',
      'connections',
      'chat',
      'universities',
      'groups',
      'search',
      'saved',
      'dashboard',
      'profile',
    ]);
    expect(sidebarItemsForState(state, location('/', '?saved=1'))
      .find((entry) => entry.id === 'saved')?.active).toBe(true);
    expect(sidebarItemsForState(state, location('/dashboard/posts/new'))
      .find((entry) => entry.id === 'dashboard')?.active).toBe(true);
    expect(sidebarActionForState(state))
      .toEqual({ label: '+ สร้างโพสต์ใหม่', href: '/dashboard/posts/new' });
    expect(mobileItemsForState(state, location('/chat')).map((entry) => entry.id))
      .toEqual(['feed', 'connections', 'chat', 'profile']);
  });

  it('adds moderation only for administrators', () => {
    const regular: AuthState = { status: 'authenticated', user, accessToken: 'token' };
    const admin: AuthState = {
      status: 'authenticated',
      user: { ...user, role: 'admin' },
      accessToken: 'token',
    };
    expect(ids(regular)).not.toContain('moderation');
    expect(ids(admin, '/admin/moderation')).toContain('moderation');
    expect(sidebarItemsForState(admin, location('/admin/moderation'))
      .find((entry) => entry.id === 'moderation')?.active).toBe(true);
  });
});

import type { AuthState } from '../core/auth/auth-store';

export type NavigationIcon =
  | 'feed'
  | 'connections'
  | 'chats'
  | 'institutions'
  | 'search'
  | 'user';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: NavigationIcon;
  active: boolean;
}

export interface NavigationLocation {
  pathname: string;
  search: string;
}

function isSavedFeed(location: NavigationLocation): boolean {
  return location.pathname === '/' && new URLSearchParams(location.search).get('saved') === '1';
}

function item(
  id: string,
  label: string,
  href: string,
  icon: NavigationIcon,
  active: boolean,
): NavigationItem {
  return { id, label, href, icon, active };
}

export function sidebarItemsForState(
  state: Readonly<AuthState>,
  location: NavigationLocation,
): NavigationItem[] {
  const path = location.pathname;
  const saved = isSavedFeed(location);
  const items: NavigationItem[] = [
    item('feed', 'ฟีดข่าว', '/', 'feed', (path === '/' && !saved) || path.startsWith('/posts/')),
  ];

  const isCompleteMember = state.status === 'authenticated'
    && state.user
    && !state.user.needsProfileCompletion;

  if (isCompleteMember) {
    items.push(
      item('connections', 'เพื่อน & การเชื่อมต่อ', '/connections', 'connections', path === '/connections'),
      item('chat', 'แชท', '/chat', 'chats', path === '/chat'),
    );
  }

  items.push(
    item('universities', 'สถาบัน', '/universities', 'institutions', path.startsWith('/universities')),
    item('groups', 'กลุ่ม', '/groups', 'connections', path.startsWith('/groups')),
    item('search', 'สำรวจ', '/search', 'search', path === '/search'),
  );

  if (state.status === 'authenticated' && state.user) {
    if (state.user.needsProfileCompletion) {
      items.push(item(
        'complete-profile',
        'กรอกโปรไฟล์ให้เสร็จ',
        '/complete-profile',
        'user',
        path === '/complete-profile',
      ));
      return items;
    }

    items.push(
      item('saved', 'บันทึกไว้', '/?saved=1', 'feed', saved),
      item('dashboard', 'โพสต์ของฉัน', '/dashboard', 'feed', path.startsWith('/dashboard')),
      item('profile', 'โปรไฟล์', '/profile', 'user', path === '/profile' || path.startsWith('/profile/')),
    );

    if (state.user.role === 'admin') {
      items.push(item(
        'moderation',
        'การดูแลระบบ',
        '/admin/moderation',
        'user',
        path === '/admin/moderation',
      ));
    }
  }

  return items;
}

export function mobileItemsForState(
  state: Readonly<AuthState>,
  location: NavigationLocation,
): NavigationItem[] {
  const all = sidebarItemsForState(state, location);

  if (state.status !== 'authenticated' || !state.user) {
    return all.filter((entry) => ['feed', 'search', 'universities'].includes(entry.id));
  }

  if (state.user.needsProfileCompletion) {
    return all.filter((entry) => ['feed', 'complete-profile', 'search'].includes(entry.id));
  }

  return all.filter((entry) => ['feed', 'connections', 'chat', 'profile'].includes(entry.id));
}

export function sidebarActionForState(
  state: Readonly<AuthState>,
): { label: string; href: string } | null {
  if (state.status === 'loading') return null;
  if (state.status !== 'authenticated' || !state.user) {
    return { label: 'เข้าสู่ระบบ', href: '/login' };
  }
  if (state.user.needsProfileCompletion) {
    return { label: 'กรอกโปรไฟล์ให้เสร็จ', href: '/complete-profile' };
  }
  return { label: '+ สร้างโพสต์ใหม่', href: '/dashboard/posts/new' };
}

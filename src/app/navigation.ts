import type { AuthState } from '../core/auth/auth-store';

export type NavigationIcon =
  | 'feed'
  | 'connections'
  | 'chats'
  | 'institutions'
  | 'groups'
  | 'bookmark'
  | 'posts'
  | 'shield'
  | 'search'
  | 'user'
  | 'plus';

export type NavigationSection = 'discover' | 'social' | 'your-space' | 'account' | 'admin';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: NavigationIcon;
  active: boolean;
  section?: NavigationSection | undefined;
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
  section?: NavigationSection,
): NavigationItem {
  return section !== undefined
    ? { id, label, href, icon, active, section }
    : { id, label, href, icon, active };
}

export function sidebarItemsForState(
  state: Readonly<AuthState>,
  location: NavigationLocation,
): NavigationItem[] {
  const path = location.pathname;
  const saved = isSavedFeed(location);
  const items: NavigationItem[] = [
    item('feed', 'ฟีดข่าว', '/', 'feed', (path === '/' && !saved) || path.startsWith('/posts/'), 'discover'),
  ];

  const isCompleteMember = state.status === 'authenticated'
    && state.user
    && !state.user.needsProfileCompletion;

  if (isCompleteMember) {
    items.push(
      item('connections', 'เพื่อน & การเชื่อมต่อ', '/connections', 'connections', path === '/connections', 'social'),
      item('chat', 'แชท', '/chat', 'chats', path === '/chat', 'social'),
    );
  }

  items.push(
    item('universities', 'สถาบัน', '/universities', 'institutions', path.startsWith('/universities'), 'discover'),
    item('groups', 'กลุ่ม', '/groups', 'groups', path.startsWith('/groups'), 'discover'),
    item('search', 'สำรวจ', '/search', 'search', path === '/search', 'discover'),
  );

  if (state.status === 'authenticated' && state.user) {
    if (state.user.needsProfileCompletion) {
      items.push(item(
        'complete-profile',
        'กรอกโปรไฟล์ให้เสร็จ',
        '/complete-profile',
        'user',
        path === '/complete-profile',
        'account',
      ));
      return items;
    }

    items.push(
      item('saved', 'บันทึกไว้', '/?saved=1', 'bookmark', saved, 'your-space'),
      item('dashboard', 'โพสต์ของฉัน', '/dashboard', 'posts', path.startsWith('/dashboard'), 'your-space'),
      item('profile', 'โปรไฟล์', '/profile', 'user', path === '/profile' || path.startsWith('/profile/'), 'account'),
    );

    if (state.user.role === 'admin') {
      items.push(item(
        'moderation',
        'การดูแลระบบ',
        '/admin/moderation',
        'shield',
        path === '/admin/moderation',
        'admin',
      ));
    }
  }

  return items;
}

export function mobileItemsForState(
  state: Readonly<AuthState>,
  location: NavigationLocation,
): NavigationItem[] {
  const path = location.pathname;

  if (state.status !== 'authenticated' || !state.user) {
    return [
      item('feed', 'ฟีด', '/', 'feed', path === '/' || path.startsWith('/posts/')),
      item('universities', 'สถาบัน', '/universities', 'institutions', path.startsWith('/universities')),
      item('search', 'สำรวจ', '/search', 'search', path === '/search'),
    ];
  }

  if (state.user.needsProfileCompletion) {
    return [
      item('feed', 'ฟีด', '/', 'feed', path === '/' || path.startsWith('/posts/')),
      item('search', 'สำรวจ', '/search', 'search', path === '/search'),
      item('complete-profile', 'โปรไฟล์', '/complete-profile', 'user', path === '/complete-profile'),
    ];
  }

  return [
    item('feed', 'หน้าแรก', '/', 'feed', (path === '/' && !isSavedFeed(location)) || path.startsWith('/posts/')),
    item('search', 'สำรวจ', '/search', 'search', path === '/search'),
    item('create', 'สร้างโพสต์', '/dashboard/posts/new', 'posts', path === '/dashboard/posts/new'),
    item('chat', 'แชท', '/chat', 'chats', path === '/chat'),
    item('profile', 'โปรไฟล์', '/profile', 'user', path === '/profile' || path.startsWith('/profile/')),
  ];
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

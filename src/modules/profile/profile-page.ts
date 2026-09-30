import { authStore } from '../../core/auth/auth-store';
import { realtime } from '../../core/realtime/socket';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import type { PaginatedPosts, Post } from '../../types/api';
import { respondFriendRequest, sendFriendRequest } from '../friends/friends-api';
import { chatsApi, type Chat } from '../chats/chats-api';
import { getPostImages, pagination, postCard } from '../posts/post-components';
import { assetUrl } from '../posts/posts-api';
import { profileApi, profileImageUrl, type PaginatedProfileFriends, type UserProfile } from './profile-api';

type ProfileTab = 'posts' | 'about' | 'friends' | 'photos' | 'groups';
const profileTabs: ReadonlyArray<{ id: ProfileTab; label: string }> = [
  { id: 'posts', label: 'โพสต์' },
  { id: 'about', label: 'เกี่ยวกับ' },
  { id: 'friends', label: 'เพื่อน' },
  { id: 'photos', label: 'รูปภาพ' },
  { id: 'groups', label: 'กลุ่ม' },
];

function profileHref(basePath: string, tab: ProfileTab, page?: number): string {
  const query = new URLSearchParams();
  if (tab !== 'posts') query.set('tab', tab);
  if (page && page > 1) query.set('page', String(page));
  return query.size ? `${basePath}?${query}` : basePath;
}

function profileState(message: string): HTMLElement {
  return el('div', { className: 'profile-state', text: message });
}

function badgeClass(university: string): string {
  switch (university) {
    case 'KMITL': return 'badge-tag--kmitl';
    case 'KMUTT': return 'badge-tag--kmutt';
    case 'KMUTNB': return 'badge-tag--kmutnb';
    default: return 'badge-tag--tech-uni';
  }
}

function academicText(person: { department?: string; faculty?: string }): string {
  return [person.department, person.faculty].filter(Boolean).join(' • ');
}

function profilePostImages(post: Post): string[] {
  const attachedImages = [...(post.media || []), ...(post.attachments || [])]
    .filter((item) => item.mimeType.startsWith('image/'))
    .map((item) => assetUrl(item.url));
  return [...new Set([
    ...getPostImages(post),
    ...(post.coverImage ? [assetUrl(post.coverImage)] : []),
    ...attachedImages,
  ])];
}

function validPage(value: string | null): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function notFoundPage(): PageView {
  const root = el('section', { className: 'profile-page-shell' });
  root.append(el('h1', { className: 'profile-page-title', text: 'โปรไฟล์' }));
  const state = profileState('ไม่พบโปรไฟล์นี้');
  state.append(el('a', { className: 'profile-state-link', text: 'กลับไปหน้าฟีด', attrs: { href: '/' } }));
  root.append(state);
  return { title: 'ไม่พบโปรไฟล์', element: root };
}

function resolveUserId(context: RouteContext): string {
  const param = (context.params.id || context.query.get('id') || '').trim();
  if (!param) return authStore.snapshot.user?._id || '';
  if (/^[a-f\d]{24}$/i.test(param)) return param;
  return '';
}

export async function profilePage(context: RouteContext): Promise<PageView> {
  const userId = resolveUserId(context);
  if (!userId) {
    if (!context.params.id && !context.query.get('id') && authStore.snapshot.status !== 'authenticated') {
      return { title: 'โปรไฟล์', element: el('div'), redirectTo: '/login?returnTo=%2Fprofile' };
    }
    return notFoundPage();
  }

  let profile: UserProfile;
  try {
    profile = await profileApi.get(userId);
  } catch (cause) {
    if (typeof cause === 'object' && cause !== null && 'status' in cause && cause.status === 404) return notFoundPage();
    throw cause;
  }

  const rawTab = context.query.get('tab');
  const tab: ProfileTab = profileTabs.some((item) => item.id === rawTab) ? rawTab as ProfileTab : 'posts';
  const page = validPage(context.query.get('page'));
  const basePath = context.url.pathname;
  const isSelf = profile.relationshipStatus === 'self' || authStore.snapshot.user?._id === profile.id;
  const root = el('section', { className: 'profile-page-shell' });
  root.append(el('h1', { className: 'profile-page-title', text: 'โปรไฟล์' }));

  const header = el('div', { className: 'profile-header-card' });
  const banner = el('div', { className: 'profile-banner' });
  if (profile.coverUrl) {
    banner.append(el('img', {
      className: 'profile-cover-image',
      attrs: { src: profileImageUrl(profile.coverUrl), alt: '' },
    }));
  } else {
    banner.textContent = 'พื้นที่รูปหน้าปก';
  }
  header.append(banner);
  const contentRow = el('div', { className: 'profile-content-row' });
  const avatar = el('div', { className: 'profile-large-avatar', attrs: { 'aria-label': `รูปโปรไฟล์ของ ${profile.name}` } });
  if (profile.avatarUrl) {
    avatar.append(el('img', {
      className: 'profile-avatar-image',
      attrs: { src: profileImageUrl(profile.avatarUrl), alt: '' },
    }));
  }
  contentRow.append(avatar);

  const mainInfo = el('div', { className: `profile-main-info${profile.username ? ' profile-main-info--has-username' : ''}` });
  mainInfo.append(el('h2', { className: 'profile-name-heading', text: profile.name }));
  if (profile.username) mainInfo.append(el('div', { className: 'profile-username', text: `@${profile.username}` }));
  const academic = el('div', { className: 'profile-academic-line' });
  academic.append(el('span', { className: `badge-tag ${badgeClass(profile.university)}`, text: profile.university }));
  const details = [academicText(profile), profile.academicYear ? `ปี ${profile.academicYear}` : ''].filter(Boolean).join(' • ');
  if (details) academic.append(el('span', { text: details }));
  mainInfo.append(academic);
  if (profile.bio) mainInfo.append(el('p', { className: 'profile-bio-text', text: profile.bio }));

  const counts = el('div', { className: 'profile-counts' });
  const updateCounts = (): void => {
    counts.replaceChildren(el('span', { text: `เพื่อน ${profile.friendCount.toLocaleString('th-TH')} คน` }));
    if (!isSelf && authStore.snapshot.status === 'authenticated') {
      counts.append(el('span', { attrs: { 'aria-hidden': 'true' }, text: '•' }));
      counts.append(el('span', { text: `เพื่อนร่วมกัน ${profile.mutualFriendCount.toLocaleString('th-TH')} คน` }));
    }
  };
  updateCounts();
  mainInfo.append(counts);

  const actionsSlot = el('div', { className: 'profile-action-slot' });
  let disposed = false;
  const refreshProfile = async (): Promise<void> => {
    try {
      const updated = await profileApi.get(profile.id);
      if (disposed) return;
      profile = updated;
      updateCounts();
      renderFriendAction();
    } catch {
      // Keep the last valid profile while the connection recovers.
    }
  };

  const renderFriendAction = (): void => {
    actionsSlot.replaceChildren();
    if (isSelf) {
      actionsSlot.append(el('a', {
        className: 'profile-friend-btn profile-friend-btn--edit',
        text: 'แก้ไขโปรไฟล์',
        attrs: { href: '/profile/edit' },
      }));
      return;
    }
    if (authStore.snapshot.status !== 'authenticated') {
      actionsSlot.append(el('a', {
        className: 'profile-friend-btn profile-friend-btn--add',
        text: 'เข้าสู่ระบบเพื่อเพิ่มเพื่อน',
        attrs: { href: `/login?returnTo=${encodeURIComponent(basePath)}` },
      }));
      return;
    }
    if (profile.relationshipStatus === 'friends') {
      actionsSlot.append(el('a', {
        className: 'profile-friend-btn profile-friend-btn--friend',
        text: 'แชท',
        attrs: { href: `/chat?userId=${encodeURIComponent(profile.id)}` },
      }));
      return;
    }
    if (profile.relationshipStatus === 'pending_sent') {
      actionsSlot.append(el('span', { className: 'profile-friend-btn profile-friend-btn--pending', text: 'ส่งคำขอแล้ว' }));
      return;
    }
    const pendingReceived = profile.relationshipStatus === 'pending_received';
    const button = el('button', {
      className: 'profile-friend-btn profile-friend-btn--add',
      text: pendingReceived ? 'ยอมรับคำขอ' : '+ เพิ่มเพื่อน',
      attrs: { type: 'button' },
    });
    button.disabled = pendingReceived && !profile.requestId;
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        if (pendingReceived && profile.requestId) {
          await respondFriendRequest(profile.requestId, 'accept');
          profile = { ...profile, relationshipStatus: 'friends', requestId: null, friendCount: profile.friendCount + 1 };
          toast.success('เป็นเพื่อนกันแล้ว');
        } else {
          await sendFriendRequest(profile.id);
          profile = { ...profile, relationshipStatus: 'pending_sent', requestId: null };
          toast.success(`ส่งคำขอเป็นเพื่อนไปยัง ${profile.name} แล้ว`);
        }
        updateCounts();
        renderFriendAction();
        await refreshProfile();
      } catch (cause) {
        toast.error(errorMessage(cause));
        button.disabled = false;
      }
    });
    actionsSlot.append(button);
  };
  renderFriendAction();
  contentRow.append(mainInfo, actionsSlot);
  header.append(contentRow);
  root.append(header);

  const tabs = el('nav', { className: 'profile-tabs', attrs: { 'aria-label': 'ส่วนต่าง ๆ ของโปรไฟล์' } });
  for (const item of profileTabs) {
    tabs.append(el('a', {
      className: `profile-tab${item.id === tab ? ' profile-tab--active' : ''}`,
      text: item.label,
      attrs: { href: profileHref(basePath, item.id), ...(item.id === tab ? { 'aria-current': 'page' } : {}) },
    }));
  }
  root.append(tabs);

  const section = el('div', { className: `profile-tab-panel profile-tab-panel--${tab}` });
  root.append(section);
  if (tab === 'posts') {
    try {
      renderPosts(section, await profileApi.posts(profile.id, page, 10), basePath, isSelf);
    } catch (cause) {
      section.append(profileState(`ไม่สามารถโหลดโพสต์ได้: ${errorMessage(cause)}`));
    }
  } else if (tab === 'about') {
    renderAbout(section, profile, isSelf);
  } else if (tab === 'friends') {
    try {
      renderFriends(section, await profileApi.friends(profile.id, page, 20), basePath);
    } catch (cause) {
      section.append(profileState(`ไม่สามารถโหลดรายชื่อเพื่อนได้: ${errorMessage(cause)}`));
    }
  } else if (tab === 'photos') {
    await renderPhotos(section, profile.id, () => disposed);
  } else if (isSelf) {
    try {
      renderGroups(section, (await chatsApi.list()).filter((chat) => chat.type === 'group'));
    } catch (cause) {
      section.append(profileState(`ไม่สามารถโหลดกลุ่มได้: ${errorMessage(cause)}`));
    }
  } else {
    section.append(profileState('ยังไม่มีข้อมูลกลุ่มของผู้ใช้นี้ให้แสดง'));
  }

  const unsubscribeFriend = realtime.onFriendUpdated(() => { void refreshProfile(); });
  return {
    title: `โปรไฟล์ - ${profile.name}`,
    element: root,
    dispose: () => { disposed = true; unsubscribeFriend(); },
  };
}

function renderPosts(section: HTMLElement, result: PaginatedPosts, basePath: string, isSelf: boolean): void {
  if (!result.items.length) {
    section.append(profileState(result.total ? 'ไม่พบโพสต์ในหน้านี้' : 'ยังไม่มีโพสต์ที่เผยแพร่'));
    return;
  }
  for (const post of result.items) section.append(postCard(post, { mine: isSelf }));
  const pager = pagination(result.page, result.pages, '', profileHref(basePath, 'posts'));
  if (pager) section.append(pager);
}

function renderAbout(section: HTMLElement, profile: UserProfile, isSelf: boolean): void {
  const card = el('div', { className: 'profile-detail-card' });
  card.append(el('h3', { text: 'ข้อมูลเกี่ยวกับ' }));
  const list = el('dl', { className: 'profile-detail-list' });
  const fields: Array<[string, string]> = [
    ...(profile.username ? [['Username', `@${profile.username}`] as [string, string]] : []),
    ...(profile.bio ? [['Bio', profile.bio] as [string, string]] : []),
    ['สถาบัน', profile.university],
    ['คณะ', profile.faculty || 'ยังไม่ระบุ'],
    ['ภาควิชา', profile.department || 'ยังไม่ระบุ'],
    ['ชั้นปี', profile.academicYear ? `ปี ${profile.academicYear}` : 'ยังไม่ระบุ'],
    ['เพื่อน', `${profile.friendCount.toLocaleString('th-TH')} คน`],
  ];
  if (!isSelf && authStore.snapshot.status === 'authenticated') {
    fields.push(['เพื่อนร่วมกัน', `${profile.mutualFriendCount.toLocaleString('th-TH')} คน`]);
  }
  for (const [label, value] of fields) list.append(el('dt', { text: label }), el('dd', { text: value }));
  card.append(list);
  section.append(card);
}

function renderFriends(section: HTMLElement, result: PaginatedProfileFriends, basePath: string): void {
  if (!result.items.length) {
    section.append(profileState(result.total ? 'ไม่พบเพื่อนในหน้านี้' : 'ยังไม่มีเพื่อนที่ตอบรับแล้ว'));
    return;
  }
  const grid = el('div', { className: 'profile-friends-grid' });
  for (const friend of result.items) {
    const card = el('a', { className: 'profile-person-card', attrs: { href: `/profile/${encodeURIComponent(friend.id)}` } });
    card.append(el('span', { className: 'profile-person-avatar', attrs: { 'aria-hidden': 'true' } }));
    const info = el('span', { className: 'profile-person-info' });
    info.append(el('strong', { text: friend.name }), el('small', { text: [friend.university, academicText(friend)].filter(Boolean).join(' • ') }));
    card.append(info);
    grid.append(card);
  }
  section.append(grid);
  const pager = pagination(result.page, result.pages, '', basePath, { tab: 'friends' });
  if (pager) section.append(pager);
}

async function renderPhotos(section: HTMLElement, userId: string, isDisposed: () => boolean): Promise<void> {
  const grid = el('div', { className: 'profile-photo-grid' });
  const loadMore = el('button', { className: 'profile-load-more', text: 'โหลดรูปภาพเพิ่มเติม', attrs: { type: 'button' } });
  let nextPage = 1;
  let pages = 1;
  let loading = false;
  const load = async (): Promise<void> => {
    if (loading || nextPage > pages || isDisposed()) return;
    loading = true;
    loadMore.disabled = true;
    try {
      // Skip text-only pages so older photos are still discoverable.
      do {
        const result = await profileApi.posts(userId, nextPage, 30, true);
        if (isDisposed()) return;
        pages = result.pages;
        nextPage += 1;
        for (const post of result.items) {
          for (const [index, src] of profilePostImages(post).entries()) {
            const photo = el('a', { className: 'profile-photo', attrs: { href: `/posts/${encodeURIComponent(post._id)}`, 'aria-label': `ดูรูปที่ ${index + 1} จากโพสต์ ${post.title}` } });
            photo.append(el('img', { attrs: { src, alt: post.title || `รูปที่ ${index + 1}`, loading: 'lazy' } }));
            grid.append(photo);
          }
        }
      } while (!grid.childElementCount && nextPage <= pages);
      loadMore.hidden = nextPage > pages;
      if (!grid.childElementCount && nextPage > pages) section.append(profileState('ยังไม่มีรูปภาพในโพสต์ที่เผยแพร่'));
    } catch (cause) {
      section.append(profileState(`ไม่สามารถโหลดรูปภาพได้: ${errorMessage(cause)}`));
      loadMore.hidden = true;
    } finally {
      loading = false;
      loadMore.disabled = false;
    }
  };
  section.append(grid, loadMore);
  loadMore.addEventListener('click', () => { void load(); });
  await load();
}

function renderGroups(section: HTMLElement, groups: Chat[]): void {
  if (!groups.length) {
    section.append(profileState('คุณยังไม่มีกลุ่มสนทนา'));
    return;
  }
  const grid = el('div', { className: 'profile-groups-grid' });
  for (const group of groups) {
    const card = el('a', { className: 'profile-person-card', attrs: { href: `/chat?chatId=${encodeURIComponent(group.id)}` } });
    card.append(el('span', { className: 'profile-group-icon', text: '👥', attrs: { 'aria-hidden': 'true' } }));
    const info = el('span', { className: 'profile-person-info' });
    info.append(el('strong', { text: group.name || 'กลุ่มสนทนา' }), el('small', { text: `${group.members.length} สมาชิก` }));
    card.append(info);
    grid.append(card);
  }
  section.append(grid);
}

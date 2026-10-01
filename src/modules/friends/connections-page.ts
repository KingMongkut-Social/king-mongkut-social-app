import { realtime } from '../../core/realtime/socket';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { createEmptyState, createErrorState } from '../../core/ui/feedback';
import { toast } from '../../core/ui/toast';
import { confirmAction } from '../../core/ui/confirm-dialog';
import { createAvatar } from '../../core/ui/avatar';
import {
  cancelFriendRequest, listFriends, listFriendRequests, listSuggestedFriends, removeFriend,
  respondFriendRequest, searchFriends, sendFriendRequest,
  type AcceptedFriend, type FriendPerson, type FriendRequests, type FriendUser,
} from './friends-api';

type Tab = 'friends' | 'incoming' | 'outgoing' | 'suggestions';

const tabs: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'friends', label: 'เพื่อนทั้งหมด' },
  { id: 'incoming', label: 'คำขอเป็นเพื่อน' },
  { id: 'outgoing', label: 'คำขอที่ส่ง' },
  { id: 'suggestions', label: 'คนที่คุณอาจรู้จัก' },
];

function connectionsEmptyState(
  title: string,
  description: string,
  actionText?: string,
  actionHref?: string,
): HTMLElement {
  const state = createEmptyState({
    iconName: 'user-plus',
    title,
    description,
    actionText,
    actionHref,
  });
  state.classList.add('connections-empty-state');
  return state;
}

function mutualText(person: FriendPerson): string {
  return `มีเพื่อนร่วมกัน ${person.mutualFriendCount ?? 0} คน`;
}

function studentCard(person: FriendPerson, summary: string, actions: HTMLElement): HTMLElement {
  const card = el('article', { className: 'student-card' });
  const header = el('div', { className: 'student-card-header' });
  const avatar = createAvatar({
    url: person.avatarUrl,
    name: person.name,
    size: 'lg',
    className: 'student-avatar',
  });
  const avatarLink = el('a', {
    className: 'student-avatar-link',
    attrs: { href: `/profile/${encodeURIComponent(person.id)}`, 'aria-label': `ดูโปรไฟล์ของ ${person.name}` },
  }, avatar);
  const info = el('div', { className: 'student-info' });
  info.append(
    el('a', { className: 'student-name', text: person.name, attrs: { href: `/profile/${encodeURIComponent(person.id)}` } }),
  );
  if (person.username) {
    info.append(el('span', { className: 'student-username', text: `@${person.username}` }));
  }
  info.append(
    el('span', { className: `student-uni-badge student-uni-badge--${person.university.toLowerCase()}`, text: person.university }),
  );
  const footer = el('div', { className: 'student-card-footer' });
  footer.append(el('span', { className: 'student-mutual-count', text: summary }), actions);
  header.append(avatarLink, info);
  card.append(header, footer);
  return card;
}

function messageAction(userId: string): HTMLElement {
  return el('a', {
    className: 'button button--secondary button--small btn-message-friend', text: 'ข้อความ',
    attrs: { href: `/chat?userId=${encodeURIComponent(userId)}` },
  });
}

export function connectionsPage(context?: RouteContext): PageView {
  const initial = context?.query.get('tab');
  let activeTab: Tab = tabs.some((item) => item.id === initial) ? initial as Tab : 'friends';
  const container = el('section', { className: 'connections-page-wrap' });
  container.append(el('h1', { className: 'connections-page-title', text: 'เพื่อน & การเชื่อมต่อ' }));

  const tabBar = el('div', { className: 'connections-subtabs', attrs: { role: 'tablist', 'aria-label': 'รายการเพื่อน' } });
  const searchControls = el('div', { className: 'connections-search-controls' });
  const searchInput = el('input', {
    className: 'connections-search-input',
    attrs: { type: 'search', placeholder: 'ค้นหาชื่อเพื่อน', 'aria-label': 'ค้นหาชื่อเพื่อน' },
  });
  const university = el('select', { className: 'connections-university', attrs: { 'aria-label': 'กรองสถาบัน' } });
  for (const [value, label] of [
    ['All', 'ทุกสถาบัน'], ['KMITL', 'KMITL'], ['KMUTT', 'KMUTT'], ['KMUTNB', 'KMUTNB'],
  ] as const) university.append(el('option', { text: label, attrs: { value } }));
  searchControls.append(searchInput, university);

  const status = el('p', { className: 'connections-status', attrs: { role: 'status' } });
  const grid = el('div', { className: 'connections-cards-grid', attrs: { role: 'tabpanel' } });
  container.append(tabBar, searchControls, status, grid);

  let friends: AcceptedFriend[] = [];
  let requests: FriendRequests = { incoming: [], outgoing: [] };
  let suggested: FriendUser[] = [];
  let friendsCount: number | null = null;
  let incomingCount: number | null = null;
  let outgoingCount: number | null = null;
  let loading = true;
  let error = '';
  let disposed = false;
  let loadVersion = 0;
  let searchTimer = 0;

  async function act(button: HTMLButtonElement, operation: () => Promise<unknown>, success: string): Promise<void> {
    button.disabled = true;
    try {
      await operation();
      toast.success(success);
      await load();
    } catch (cause) {
      toast.error(errorMessage(cause));
      button.disabled = false;
    }
  }

  function requestActions(user: FriendUser): HTMLElement {
    if (user.relationshipStatus === 'friends') {
      const actions = el('div', { className: 'connections-actions' }, messageAction(user.id));
      if (user.requestId) {
        const remove = el('button', { className: 'button button--danger button--small btn-reject-icon', text: 'เลิกเป็นเพื่อน', attrs: { type: 'button' } });
        remove.addEventListener('click', async () => {
          const confirmed = await confirmAction({
            title: 'เลิกเป็นเพื่อน',
            message: `เลิกเป็นเพื่อนกับ ${user.name}? คุณจะไม่เห็นสถานะออนไลน์ของผู้ใช้นี้ และ Direct Chat ใหม่อาจไม่สามารถเริ่มได้`,
            confirmText: 'เลิกเป็นเพื่อน',
            danger: true,
          });
          if (!confirmed) return;
          void act(remove, () => removeFriend(user.requestId!), 'เลิกเป็นเพื่อนแล้ว');
        });
        actions.append(remove);
      }
      return actions;
    }
    if (user.relationshipStatus === 'pending_sent') {
      return el('span', { className: 'connections-pending-label', text: 'ส่งคำขอแล้ว' });
    }
    if (user.relationshipStatus === 'pending_received' && user.requestId) {
      const accept = el('button', { className: 'button button--primary button--small btn-accept-request', text: 'ยอมรับ', attrs: { type: 'button' } });
      accept.addEventListener('click', () => void act(accept, () => respondFriendRequest(user.requestId!, 'accept'), 'เป็นเพื่อนกันแล้ว'));
      return accept;
    }
    const add = el('button', { className: 'button button--primary button--small btn-add-friend', text: '+ เพิ่มเพื่อน', attrs: { type: 'button' } });
    add.addEventListener('click', () => void act(add, () => sendFriendRequest(user.id), 'ส่งคำขอเป็นเพื่อนแล้ว'));
    return add;
  }

  function renderTabs(): void {
    tabBar.replaceChildren();
    for (const item of tabs) {
      let count: number | null = null;
      if (item.id === 'friends') count = friendsCount;
      else if (item.id === 'incoming') count = incomingCount;
      else if (item.id === 'outgoing') count = outgoingCount;

      const button = el('button', {
        className: `subtab-btn${item.id === activeTab ? ' subtab-btn--active' : ''}`,
        attrs: { type: 'button', role: 'tab', 'aria-selected': String(item.id === activeTab) },
      });
      button.append(el('span', { text: item.label }));
      if (count !== null && count > 0) {
        button.append(el('span', { className: 'subtab-count', text: String(count) }));
      }
      button.addEventListener('click', () => {
        if (item.id === activeTab) return;
        activeTab = item.id;
        searchInput.value = '';
        university.value = 'All';
        if (context && window.location.origin === context.url.origin) {
          const url = new URL(window.location.href);
          if (activeTab === 'friends') url.searchParams.delete('tab');
          else url.searchParams.set('tab', activeTab);
          window.history.pushState(null, '', `${url.pathname}${url.search}`);
        }
        void load();
      });
      tabBar.append(button);
    }
    searchControls.hidden = activeTab !== 'friends' && activeTab !== 'suggestions';
    searchInput.placeholder = activeTab === 'friends' ? 'ค้นหาชื่อเพื่อน' : 'ค้นหาผู้ใช้ที่สนใจ';
    searchInput.setAttribute('aria-label', searchInput.placeholder);
    grid.setAttribute('aria-label', tabs.find((item) => item.id === activeTab)?.label || 'รายการเพื่อน');
  }

  function render(): void {
    renderTabs();
    grid.replaceChildren();
    status.textContent = '';
    if (loading) { status.textContent = 'กำลังโหลดรายชื่อ...'; return; }
    if (error) {
      const failure = createErrorState({
        title: 'โหลดข้อมูลเพื่อนไม่สำเร็จ',
        message: error,
        onRetry: () => void load(),
      });
      failure.classList.add('connections-empty-state');
      grid.append(failure);
      return;
    }
    if (activeTab === 'friends') {
      const term = searchInput.value.trim().toLowerCase();
      const selectedUniversity = university.value;
      const filteredFriends = friends.filter((friend) => {
        const matchesTerm = !term || friend.name.toLowerCase().includes(term) || (friend.username && friend.username.toLowerCase().includes(term));
        const matchesUni = selectedUniversity === 'All' || friend.university === selectedUniversity;
        return matchesTerm && matchesUni;
      });

      if (!friends.length) {
        grid.append(connectionsEmptyState(
          'ยังไม่มีเพื่อนที่ตอบรับแล้ว',
          'เริ่มจากค้นหานักศึกษาที่คุณรู้จัก หรือดูคำแนะนำจากชุมชนของมหาวิทยาลัย',
          'ดูคนที่คุณอาจรู้จัก',
          '/connections?tab=suggestions',
        ));
      } else if (!filteredFriends.length) {
        grid.append(connectionsEmptyState(
          'ไม่พบเพื่อนที่ตรงกับตัวกรอง',
          'ลองเปลี่ยนคำค้นหาหรือเลือกทุกสถาบันเพื่อดูผลลัพธ์มากขึ้น',
        ));
      } else {
        for (const friend of filteredFriends) {
          const actions = el('div', { className: 'connections-actions' }, messageAction(friend.id));
          const remove = el('button', { className: 'button button--danger button--small btn-reject-icon', text: 'เลิกเป็นเพื่อน', attrs: { type: 'button' } });
          remove.addEventListener('click', async () => {
            const confirmed = await confirmAction({
              title: 'เลิกเป็นเพื่อน',
              message: `เลิกเป็นเพื่อนกับ ${friend.name}? คุณจะไม่เห็นสถานะออนไลน์ของผู้ใช้นี้ และ Direct Chat ใหม่อาจไม่สามารถเริ่มได้`,
              confirmText: 'เลิกเป็นเพื่อน',
              danger: true,
            });
            if (!confirmed) return;
            void act(remove, () => removeFriend(friend.friendshipId), 'เลิกเป็นเพื่อนแล้ว');
          });
          actions.append(remove);
          grid.append(studentCard(friend, mutualText(friend), actions));
        }
      }
    } else if (activeTab === 'incoming') {
      if (!requests.incoming.length) grid.append(connectionsEmptyState('ยังไม่มีคำขอเป็นเพื่อน', 'เมื่อมีคนส่งคำขอเข้ามา รายการจะปรากฏที่นี่', 'ค้นหาเพื่อน', '/connections?tab=suggestions'));
      for (const request of requests.incoming) {
        const actions = el('div', { className: 'connections-actions' });
        const accept = el('button', { className: 'button button--primary button--small btn-accept-request', text: 'ยอมรับ', attrs: { type: 'button' } });
        const reject = el('button', { className: 'button button--danger button--small btn-reject-icon', text: 'ปฏิเสธ', attrs: { type: 'button' } });
        accept.addEventListener('click', () => void act(accept, () => respondFriendRequest(request.id, 'accept'), 'เป็นเพื่อนกันแล้ว'));
        reject.addEventListener('click', () => void act(reject, () => respondFriendRequest(request.id, 'reject'), 'ปฏิเสธคำขอแล้ว'));
        actions.append(accept, reject);
        grid.append(studentCard(request.requester, 'ส่งคำขอถึงคุณ', actions));
      }
    } else if (activeTab === 'outgoing') {
      if (!requests.outgoing.length) grid.append(connectionsEmptyState('ยังไม่มีคำขอที่ส่ง', 'ค้นหาคนที่คุณรู้จักแล้วส่งคำขอเพื่อเริ่มเชื่อมต่อกัน', 'ค้นหาเพื่อน', '/connections?tab=suggestions'));
      for (const request of requests.outgoing) {
        const cancel = el('button', { className: 'button button--danger button--small btn-reject-icon', text: 'ยกเลิกคำขอ', attrs: { type: 'button' } });
        cancel.addEventListener('click', () => void act(cancel, () => cancelFriendRequest(request.id), 'ยกเลิกคำขอแล้ว'));
        grid.append(studentCard(request.recipient, 'รอการตอบรับ', cancel));
      }
    } else {
      if (!suggested.length) grid.append(connectionsEmptyState(
        searchInput.value.trim() ? 'ไม่พบผู้ใช้ที่ตรงกับการค้นหา' : 'ยังไม่มีคำแนะนำในตอนนี้',
        searchInput.value.trim()
          ? 'ลองใช้ชื่อที่สั้นลงหรือเปลี่ยนตัวกรองสถาบัน'
          : 'กลับมาดูใหม่เมื่อมีสมาชิกและเครือข่ายเพิ่มเติม',
      ));
      for (const user of suggested) grid.append(studentCard(user, mutualText(user), requestActions(user)));
    }
  }

  async function load(): Promise<void> {
    const version = ++loadVersion;
    const tab = activeTab;
    const term = searchInput.value.trim();
    const selectedUniversity = university.value;
    loading = true;
    error = '';
    render();
    try {
      if (tab === 'friends') {
        const result = await listFriends();
        if (disposed || version !== loadVersion) return;
        friends = result;
        friendsCount = result.length;
      } else if (tab === 'incoming' || tab === 'outgoing') {
        const result = await listFriendRequests();
        if (disposed || version !== loadVersion) return;
        requests = result;
        incomingCount = result.incoming.length;
        outgoingCount = result.outgoing.length;
      } else if (term) {
        const result = await searchFriends(term, selectedUniversity);
        if (disposed || version !== loadVersion) return;
        suggested = result;
      }
      else {
        const results = await listSuggestedFriends();
        if (disposed || version !== loadVersion) return;
        suggested = selectedUniversity === 'All' ? results : results.filter((user) => user.university === selectedUniversity);
      }
    } catch (cause) {
      if (disposed || version !== loadVersion) return;
      error = errorMessage(cause);
    } finally {
      if (!disposed && version === loadVersion) { loading = false; render(); }
    }
  }

  searchInput.addEventListener('input', () => {
    if (activeTab === 'friends') {
      render();
      return;
    }
    if (activeTab !== 'suggestions') return;
    window.clearTimeout(searchTimer);
    // Invalidate an in-flight response immediately, before the debounced request starts.
    ++loadVersion;
    loading = true;
    error = '';
    render();
    searchTimer = window.setTimeout(() => void load(), 300);
  });
  university.addEventListener('change', () => {
    if (activeTab === 'friends') {
      render();
      return;
    }
    if (activeTab === 'suggestions') void load();
  });
  const unsubscribe = realtime.onFriendUpdated(() => void load());
  void load();
  return {
    title: 'เพื่อน & การเชื่อมต่อ', element: container,
    dispose: () => { disposed = true; window.clearTimeout(searchTimer); unsubscribe(); },
  };
}

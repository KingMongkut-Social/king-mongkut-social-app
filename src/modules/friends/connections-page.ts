import { realtime } from '../../core/realtime/socket';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { confirmAction } from '../../core/ui/confirm-dialog';
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

function emptyState(message: string): HTMLElement {
  return el('div', { className: 'connections-empty-state', text: message });
}

function mutualText(person: FriendPerson): string {
  return `มีเพื่อนร่วมกัน ${person.mutualFriendCount ?? 0} คน`;
}

function studentCard(person: FriendPerson, summary: string, actions: HTMLElement): HTMLElement {
  const card = el('article', { className: 'student-card' });
  const header = el('div', { className: 'student-card-header' });
  const avatar = el('div', { className: 'student-avatar', attrs: { 'aria-hidden': 'true' } });
  const info = el('div', { className: 'student-info' });
  info.append(
    el('a', { className: 'student-name', text: person.name, attrs: { href: `/profile/${encodeURIComponent(person.id)}` } }),
    el('span', { className: `student-uni-badge student-uni-badge--${person.university.toLowerCase()}`, text: person.university }),
  );
  const footer = el('div', { className: 'student-card-footer' });
  footer.append(el('span', { className: 'student-mutual-count', text: summary }), actions);
  info.append(footer);
  header.append(avatar, info);
  card.append(header);
  return card;
}

function messageAction(userId: string): HTMLElement {
  return el('a', {
    className: 'btn-add-friend btn-message-friend', text: 'ข้อความ',
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
        const remove = el('button', { className: 'btn-reject-icon', text: 'เลิกเป็นเพื่อน', attrs: { type: 'button' } });
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
      const accept = el('button', { className: 'btn-accept-request', text: 'ยอมรับ', attrs: { type: 'button' } });
      accept.addEventListener('click', () => void act(accept, () => respondFriendRequest(user.requestId!, 'accept'), 'เป็นเพื่อนกันแล้ว'));
      return accept;
    }
    const add = el('button', { className: 'btn-add-friend', text: '+ เพิ่มเพื่อน', attrs: { type: 'button' } });
    add.addEventListener('click', () => void act(add, () => sendFriendRequest(user.id), 'ส่งคำขอเป็นเพื่อนแล้ว'));
    return add;
  }

  function renderTabs(): void {
    tabBar.replaceChildren();
    for (const item of tabs) {
      const button = el('button', {
        className: `subtab-btn${item.id === activeTab ? ' subtab-btn--active' : ''}`,
        text: item.label,
        attrs: { type: 'button', role: 'tab', 'aria-selected': String(item.id === activeTab) },
      });
      button.addEventListener('click', () => {
        if (item.id === activeTab) return;
        activeTab = item.id;
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
    searchControls.hidden = activeTab !== 'suggestions';
    grid.setAttribute('aria-label', tabs.find((item) => item.id === activeTab)?.label || 'รายการเพื่อน');
  }

  function render(): void {
    renderTabs();
    grid.replaceChildren();
    status.textContent = '';
    if (loading) { status.textContent = 'กำลังโหลดรายชื่อ...'; return; }
    if (error) {
      grid.append(emptyState(`ไม่สามารถโหลดรายชื่อได้: ${error}`));
      const retry = el('button', { className: 'connections-retry', text: 'ลองอีกครั้ง', attrs: { type: 'button' } });
      retry.addEventListener('click', () => void load());
      grid.append(retry);
      return;
    }
    if (activeTab === 'friends') {
      if (!friends.length) grid.append(emptyState('ยังไม่มีเพื่อนที่ตอบรับแล้ว'));
      for (const friend of friends) {
        const actions = el('div', { className: 'connections-actions' }, messageAction(friend.id));
        const remove = el('button', { className: 'btn-reject-icon', text: 'เลิกเป็นเพื่อน', attrs: { type: 'button' } });
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
    } else if (activeTab === 'incoming') {
      if (!requests.incoming.length) grid.append(emptyState('ยังไม่มีคำขอเป็นเพื่อน'));
      for (const request of requests.incoming) {
        const actions = el('div', { className: 'connections-actions' });
        const accept = el('button', { className: 'btn-accept-request', text: 'ยอมรับ', attrs: { type: 'button' } });
        const reject = el('button', { className: 'btn-reject-icon', text: 'ปฏิเสธ', attrs: { type: 'button' } });
        accept.addEventListener('click', () => void act(accept, () => respondFriendRequest(request.id, 'accept'), 'เป็นเพื่อนกันแล้ว'));
        reject.addEventListener('click', () => void act(reject, () => respondFriendRequest(request.id, 'reject'), 'ปฏิเสธคำขอแล้ว'));
        actions.append(accept, reject);
        grid.append(studentCard(request.requester, 'ส่งคำขอถึงคุณ', actions));
      }
    } else if (activeTab === 'outgoing') {
      if (!requests.outgoing.length) grid.append(emptyState('ยังไม่มีคำขอที่ส่ง'));
      for (const request of requests.outgoing) {
        const cancel = el('button', { className: 'btn-reject-icon', text: 'ยกเลิกคำขอ', attrs: { type: 'button' } });
        cancel.addEventListener('click', () => void act(cancel, () => cancelFriendRequest(request.id), 'ยกเลิกคำขอแล้ว'));
        grid.append(studentCard(request.recipient, 'รอการตอบรับ', cancel));
      }
    } else {
      if (!suggested.length) grid.append(emptyState(searchInput.value.trim() ? 'ไม่พบผู้ใช้ที่ตรงกับการค้นหา' : 'ยังไม่มีคนที่คุณอาจรู้จัก'));
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
      } else if (tab === 'incoming' || tab === 'outgoing') {
        const result = await listFriendRequests();
        if (disposed || version !== loadVersion) return;
        requests = result;
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
    window.clearTimeout(searchTimer);
    if (activeTab !== 'suggestions') return;
    // Invalidate an in-flight response immediately, before the debounced request starts.
    ++loadVersion;
    loading = true;
    error = '';
    render();
    searchTimer = window.setTimeout(() => void load(), 300);
  });
  university.addEventListener('change', () => { if (activeTab === 'suggestions') void load(); });
  const unsubscribe = realtime.onFriendUpdated(() => void load());
  void load();
  return {
    title: 'เพื่อน & การเชื่อมต่อ', element: container,
    dispose: () => { disposed = true; window.clearTimeout(searchTimer); unsubscribe(); },
  };
}

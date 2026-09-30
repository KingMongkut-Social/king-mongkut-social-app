import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { formatRelativeTime } from '../../core/utils/format';
import { listFriends } from '../friends/friends-api';
import { openReportDialog } from '../reports/report-dialog';
import { groupsApi, type CommunityGroup } from './groups-api';

type GroupTab = 'discussion' | 'members' | 'about';

function validPage(value: string | null): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function groupHref(id: string, tab: GroupTab, page = 1): string {
  const query = new URLSearchParams();
  if (tab !== 'discussion') query.set('tab', tab);
  if (page > 1) query.set('page', String(page));
  return query.size ? `/groups/${encodeURIComponent(id)}?${query}` : `/groups/${encodeURIComponent(id)}`;
}

function pager(id: string, tab: GroupTab, page: number, pages: number): HTMLElement | null {
  if (pages <= 1) return null;
  const nav = el('nav', { className: 'pagination', attrs: { 'aria-label': 'เปลี่ยนหน้า' } });
  if (page > 1) nav.append(el('a', {
    className: 'button button--secondary button--small',
    text: '← ก่อนหน้า',
    attrs: { href: groupHref(id, tab, page - 1) },
  }));
  nav.append(el('span', { className: 'platform-meta', text: `หน้า ${page} / ${pages}` }));
  if (page < pages) nav.append(el('a', {
    className: 'button button--secondary button--small',
    text: 'ถัดไป →',
    attrs: { href: groupHref(id, tab, page + 1) },
  }));
  return nav;
}

async function openInviteDialog(group: CommunityGroup): Promise<void> {
  const dialog = el('dialog', { className: 'platform-dialog group-invite-dialog' });
  const content = el('div', { className: 'platform-dialog__form' });
  content.append(el('h2', { text: `เชิญเพื่อนเข้า ${group.name}` }));
  const status = el('p', { className: 'platform-meta', text: 'กำลังโหลดรายชื่อเพื่อน…' });
  const list = el('div', { className: 'group-invite-list' });
  const close = el('button', { className: 'button button--secondary', text: 'ปิด', attrs: { type: 'button' } });
  close.addEventListener('click', () => dialog.close());
  content.append(status, list, close);
  dialog.append(content);
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal();

  try {
    const friends = await listFriends();
    status.textContent = friends.length ? 'เลือกเพื่อนที่ต้องการเชิญ' : 'ยังไม่มีเพื่อนที่ตอบรับแล้ว';
    for (const friend of friends) {
      const row = el('div', { className: 'group-invite-row' });
      const invite = el('button', {
        className: 'button button--primary button--small',
        text: 'เชิญ',
        attrs: { type: 'button' },
      });
      invite.addEventListener('click', async () => {
        invite.disabled = true;
        try {
          await groupsApi.invite(group.id, friend.id);
          invite.textContent = 'ส่งคำเชิญแล้ว';
          toast.success(`ส่งคำเชิญให้ ${friend.name} แล้ว`);
        } catch (error) {
          toast.error(errorMessage(error));
          invite.disabled = false;
        }
      });
      row.append(
        el('a', { text: friend.name, attrs: { href: `/profile/${encodeURIComponent(friend.id)}` } }),
        el('span', { className: 'platform-meta', text: friend.university }),
        invite,
      );
      list.append(row);
    }
  } catch (error) {
    status.textContent = errorMessage(error);
  }
}

export async function groupPage(context: RouteContext): Promise<PageView> {
  const id = context.params.id ?? '';
  const rawTab = context.query.get('tab');
  const tab: GroupTab = rawTab === 'members' || rawTab === 'about' ? rawTab : 'discussion';
  const page = validPage(context.query.get('page'));
  const root = el('section', { className: 'platform-page group-detail-page' });

  try {
    let group = await groupsApi.get(id);

    const hero = el('header', { className: 'group-hero' });
    const action = el('button', {
      className: group.joined ? 'button button--secondary' : 'button button--primary',
      text: group.joined ? (group.membershipRole === 'owner' ? 'เจ้าของกลุ่ม' : 'ออกจากกลุ่ม') : 'เข้าร่วมกลุ่ม',
      attrs: { type: 'button' },
    });
    if (group.membershipRole === 'owner' || (group.privacy === 'private' && !group.joined)) action.disabled = true;
    action.addEventListener('click', async () => {
      if (authStore.snapshot.status !== 'authenticated') {
        window.history.pushState(null, '', `/login?returnTo=${encodeURIComponent('/groups/' + id)}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
      action.disabled = true;
      try {
        if (group.joined) {
          await groupsApi.leave(id);
          group = { ...group, joined: false, membershipRole: null, memberCount: Math.max(0, group.memberCount - 1) };
          window.history.pushState(null, '', '/groups');
        } else {
          group = await groupsApi.join(id);
        }
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (error) {
        toast.error(errorMessage(error));
        action.disabled = false;
      }
    });

    const heroActions = el('div', { className: 'group-hero__actions' }, action);
    if (authStore.snapshot.status === 'authenticated') {
      if (group.privacy === 'private' && (group.membershipRole === 'owner' || group.membershipRole === 'admin')) {
        const invite = el('button', {
          className: 'button button--primary',
          text: 'เชิญสมาชิก',
          attrs: { type: 'button' },
        });
        invite.addEventListener('click', () => void openInviteDialog(group));
        heroActions.append(invite);
      }
      const reportGroup = el('button', {
        className: 'button button--secondary',
        text: 'รายงานกลุ่ม',
        attrs: { type: 'button' },
      });
      reportGroup.addEventListener('click', () => {
        openReportDialog({ targetType: 'group', targetId: id, title: `รายงานกลุ่ม ${group.name}` });
      });
      heroActions.append(reportGroup);
    }

    const tabs = el('nav', { className: 'community-tabs', attrs: { 'aria-label': 'ส่วนต่าง ๆ ของกลุ่ม' } });
    for (const item of [
      ['discussion', 'การสนทนา'],
      ['members', 'สมาชิก'],
      ['about', 'เกี่ยวกับ'],
    ] as const) {
      tabs.append(el('a', {
        className: `community-tab${tab === item[0] ? ' community-tab--active' : ''}`,
        text: item[1],
        attrs: {
          href: groupHref(id, item[0]),
          ...(tab === item[0] ? { 'aria-current': 'page' } : {}),
        },
      }));
    }

    hero.append(
      el('div', { className: 'group-hero__cover' }),
      el('div', { className: 'group-hero__content' },
        el('div', {},
          el('h1', { text: group.name }),
          el('p', { text: `${group.privacy === 'public' ? 'กลุ่มสาธารณะ' : 'กลุ่มส่วนตัว'} · ${group.memberCount} สมาชิก` }),
        ),
        heroActions,
      ),
      tabs,
    );
    root.append(hero);

    if (tab === 'discussion') {
      const feed = el('div', { className: 'community-feed group-tab-content' });
      feed.append(el('h2', { text: 'โพสต์ในกลุ่ม' }));

      if (group.joined) {
        const form = el('form', { className: 'group-composer' });
        const textarea = el('textarea', { attrs: { rows: '3', maxlength: '20000', placeholder: 'แชร์อะไรกับสมาชิกในกลุ่ม...' } });
        const submit = el('button', { className: 'button button--primary', text: 'โพสต์', attrs: { type: 'submit' } });
        form.append(textarea, submit);
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const content = textarea.value.trim();
          if (!content) return;
          submit.disabled = true;
          try {
            await groupsApi.createPost(id, content);
            window.history.pushState(null, '', groupHref(id, 'discussion'));
            window.dispatchEvent(new PopStateEvent('popstate'));
          } catch (error) {
            toast.error(errorMessage(error));
            submit.disabled = false;
          }
        });
        feed.append(form);
      }

      const posts = await groupsApi.posts(id, page, 20);
      if (!posts.items.length) feed.append(el('div', { className: 'platform-state', text: 'ยังไม่มีโพสต์ในกลุ่ม' }));
      for (const post of posts.items) {
        feed.append(el('article', { className: 'group-post' },
          el('div', { className: 'group-post__header' },
            el('span', { className: 'community-person__avatar', text: post.author.name.charAt(0).toUpperCase() }),
            el('div', {},
              el('a', { attrs: { href: `/profile/${encodeURIComponent(post.author._id)}` }, text: post.author.name }),
              el('small', { text: formatRelativeTime(post.createdAt) }),
            ),
          ),
          el('p', { text: post.content }),
        ));
      }
      const nav = pager(id, tab, posts.page, posts.pages);
      if (nav) feed.append(nav);
      root.append(feed);
    } else if (tab === 'members') {
      const section = el('section', { className: 'community-sidebar group-tab-content' });
      section.append(el('h2', { text: 'สมาชิกในกลุ่ม' }));
      const members = await groupsApi.members(id, page, 20);
      if (!members.items.length) section.append(el('p', { className: 'platform-state', text: 'ยังไม่มีสมาชิก' }));
      for (const member of members.items) {
        const user = member.user;
        section.append(el('a', { className: 'community-person', attrs: { href: `/profile/${encodeURIComponent(user._id)}` } },
          el('span', { className: 'community-person__avatar', text: user.name.charAt(0).toUpperCase() }),
          el('span', {}, el('strong', { text: user.name }), el('small', { text: `${member.role} · ${user.university ?? ''}` })),
        ));
      }
      const nav = pager(id, tab, members.page, members.pages);
      if (nav) section.append(nav);
      root.append(section);
    } else {
      const section = el('section', { className: 'platform-card group-about group-tab-content' });
      section.append(
        el('h2', { text: 'เกี่ยวกับกลุ่ม' }),
        el('p', { text: group.description || 'ยังไม่มีคำอธิบายกลุ่ม' }),
        el('dl', { className: 'profile-detail-list' },
          el('dt', { text: 'ประเภท' }), el('dd', { text: group.privacy === 'public' ? 'สาธารณะ' : 'ส่วนตัว' }),
          el('dt', { text: 'สถาบัน' }), el('dd', { text: group.university ?? 'ทุกสถาบัน' }),
          el('dt', { text: 'สมาชิก' }), el('dd', { text: `${group.memberCount} คน` }),
        ),
      );
      root.append(section);
    }
  } catch (error) {
    root.append(el('div', { className: 'platform-state platform-state--error', text: errorMessage(error) }));
  }

  return { title: 'กลุ่ม', element: root };
}

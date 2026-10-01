import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { formatRelativeTime } from '../../core/utils/format';
import { listFriends } from '../friends/friends-api';
import { openReportDialog } from '../reports/report-dialog';
import {
  groupsApi,
  type CommunityGroup,
  type GroupPost,
  type GroupUser,
} from './groups-api';

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

function openEditGroupDialog(
  group: CommunityGroup,
  onSaved: (updated: CommunityGroup) => void,
): void {
  const dialog = el('dialog', { className: 'platform-dialog group-edit-dialog' });
  const form = el('form', { className: 'platform-dialog__form' });
  const name = el('input', {
    className: 'input',
    attrs: {
      type: 'text',
      value: group.name,
      minlength: '2',
      maxlength: '100',
      required: 'true',
      autocomplete: 'off',
      'aria-label': 'ชื่อกลุ่ม',
    },
  });
  const description = el('textarea', {
    className: 'input',
    attrs: {
      rows: '5',
      maxlength: '2000',
      'aria-label': 'รายละเอียดกลุ่ม',
    },
  });
  description.value = group.description;
  const status = el('p', { className: 'form-error', attrs: { role: 'alert' } });
  const actions = el('div', { className: 'platform-dialog__actions' });
  const cancel = el('button', {
    className: 'button button--secondary',
    text: 'ยกเลิก',
    attrs: { type: 'button' },
  });
  const save = el('button', {
    className: 'button button--primary',
    text: 'บันทึก',
    attrs: { type: 'submit' },
  });
  cancel.addEventListener('click', () => dialog.close());
  actions.append(cancel, save);
  form.append(
    el('h2', { text: 'แก้ไขกลุ่ม' }),
    el('label', { text: 'ชื่อกลุ่ม' }),
    name,
    el('label', { text: 'รายละเอียดกลุ่ม' }),
    description,
    status,
    actions,
  );
  dialog.append(form);
  dialog.addEventListener('close', () => dialog.remove());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nextName = name.value.trim();
    if (nextName.length < 2) {
      status.textContent = 'ชื่อกลุ่มต้องมีอย่างน้อย 2 ตัวอักษร';
      name.focus();
      return;
    }
    save.disabled = true;
    cancel.disabled = true;
    status.textContent = '';
    try {
      const updated = await groupsApi.update(group.id, {
        name: nextName,
        description: description.value.trim(),
      });
      toast.success('บันทึกข้อมูลกลุ่มแล้ว');
      dialog.close();
      onSaved(updated);
    } catch (error) {
      status.textContent = errorMessage(error);
      save.disabled = false;
      cancel.disabled = false;
    }
  });
  document.body.append(dialog);
  dialog.showModal();
  name.focus();
  name.select();
}

function mentionLabel(user: GroupUser): string {
  return `@${user.username?.trim() || user.name}`;
}

function appendGroupPostContent(container: HTMLElement, post: GroupPost): void {
  const mentions = (post.mentions ?? [])
    .map((user) => ({ user, token: mentionLabel(user) }))
    .filter((item) => item.token.length > 1)
    .sort((a, b) => b.token.length - a.token.length);

  let cursor = 0;
  while (cursor < post.content.length) {
    let bestIndex = -1;
    let best: (typeof mentions)[number] | undefined;
    for (const candidate of mentions) {
      const index = post.content.indexOf(candidate.token, cursor);
      if (index >= 0 && (bestIndex < 0 || index < bestIndex)) {
        bestIndex = index;
        best = candidate;
      }
    }
    if (!best || bestIndex < 0) {
      container.append(document.createTextNode(post.content.slice(cursor)));
      break;
    }
    if (bestIndex > cursor) {
      container.append(document.createTextNode(post.content.slice(cursor, bestIndex)));
    }
    container.append(el('a', {
      className: 'group-post__mention',
      text: best.token,
      attrs: { href: `/profile/${encodeURIComponent(best.user._id)}` },
    }));
    cursor = bestIndex + best.token.length;
  }
  if (!post.content.length) container.textContent = '';
}

function attachGroupMentionAutocomplete(
  groupId: string,
  form: HTMLElement,
  textarea: HTMLTextAreaElement,
): () => string[] {
  const popover = el('div', {
    className: 'group-mention-popover',
    attrs: {
      role: 'listbox',
      'aria-label': 'สมาชิกที่สามารถแท็กได้',
      hidden: 'true',
    },
  });
  form.append(popover);

  const selected = new Map<string, { label: string; user: GroupUser }>();
  let timer = 0;
  let requestId = 0;
  let activeIndex = -1;
  let itemButtons: HTMLButtonElement[] = [];

  const close = () => {
    popover.hidden = true;
    popover.replaceChildren();
    activeIndex = -1;
    itemButtons = [];
    textarea.removeAttribute('aria-activedescendant');
  };

  const currentQuery = (): { query: string; start: number; end: number } | null => {
    const end = textarea.selectionStart ?? textarea.value.length;
    const before = textarea.value.slice(0, end);
    const match = before.match(/(?:^|\s)@([^\s@]{0,100})$/u);
    if (!match) return null;
    const at = before.lastIndexOf('@');
    return at >= 0 ? { query: match[1] ?? '', start: at, end } : null;
  };

  const updateActive = (next: number) => {
    if (!itemButtons.length) return;
    activeIndex = (next + itemButtons.length) % itemButtons.length;
    itemButtons.forEach((button, index) => {
      button.classList.toggle('group-mention-option--active', index === activeIndex);
    });
    const active = itemButtons[activeIndex];
    if (active) {
      textarea.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    }
  };

  const choose = (user: GroupUser) => {
    const query = currentQuery();
    if (!query) return;
    const label = mentionLabel(user);
    textarea.setRangeText(`${label} `, query.start, query.end, 'end');
    selected.set(user._id, { label, user });
    close();
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const render = async () => {
    const query = currentQuery();
    if (!query) {
      close();
      return;
    }

    const ownRequest = ++requestId;
    popover.hidden = false;
    popover.replaceChildren(el('div', { className: 'group-mention-state', text: 'กำลังค้นหาสมาชิก…' }));
    try {
      const result = await groupsApi.members(groupId, 1, 8, query.query);
      if (ownRequest !== requestId) return;
      popover.replaceChildren();
      itemButtons = [];
      activeIndex = -1;
      if (!result.items.length) {
        popover.append(el('div', { className: 'group-mention-state', text: 'ไม่พบสมาชิกที่ตรงกับคำค้นหา' }));
        return;
      }

      result.items.forEach((member, index) => {
        const user = member.user;
        const button = el('button', {
          className: 'group-mention-option',
          attrs: {
            type: 'button',
            role: 'option',
            id: `group-mention-${index}`,
          },
        }) as HTMLButtonElement;
        button.append(
          el('span', {
            className: 'group-mention-option__avatar',
            text: user.name.charAt(0).toUpperCase(),
          }),
          el('span', { className: 'group-mention-option__copy' },
            el('strong', { text: user.name }),
            el('small', {
              text: [user.username ? `@${user.username}` : '', user.university ?? '']
                .filter(Boolean)
                .join(' · '),
            }),
          ),
        );
        button.addEventListener('pointerdown', (event) => event.preventDefault());
        button.addEventListener('click', () => choose(user));
        popover.append(button);
        itemButtons.push(button);
      });
    } catch (error) {
      if (ownRequest !== requestId) return;
      popover.replaceChildren(el('div', {
        className: 'group-mention-state group-mention-state--error',
        text: errorMessage(error),
      }));
    }
  };

  textarea.setAttribute('aria-autocomplete', 'list');
  textarea.setAttribute('aria-controls', 'group-mention-listbox');
  popover.id = 'group-mention-listbox';

  textarea.addEventListener('input', () => {
    window.clearTimeout(timer);
    if (!currentQuery()) {
      close();
      return;
    }
    timer = window.setTimeout(() => void render(), 220);
  });

  textarea.addEventListener('keydown', (event) => {
    if (popover.hidden || !itemButtons.length) {
      if (event.key === 'Escape') close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      updateActive(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      updateActive(activeIndex - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      itemButtons[activeIndex]?.click();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });

  textarea.addEventListener('blur', () => {
    window.setTimeout(close, 100);
  });

  return () => [...selected.entries()]
    .filter(([, item]) => textarea.value.includes(item.label))
    .map(([userId]) => userId);
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
    const title = el('h1', { text: group.name });
    const meta = el('p', {
      text: `${group.privacy === 'public' ? 'กลุ่มสาธารณะ' : 'กลุ่มส่วนตัว'} · ${group.memberCount} สมาชิก`,
    });
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
      if (group.membershipRole === 'owner' || group.membershipRole === 'admin') {
        const edit = el('button', {
          className: 'button button--secondary',
          text: 'แก้ไขกลุ่ม',
          attrs: { type: 'button' },
        });
        edit.addEventListener('click', () => {
          openEditGroupDialog(group, (updated) => {
            group = updated;
            title.textContent = updated.name;
            meta.textContent = `${updated.privacy === 'public' ? 'กลุ่มสาธารณะ' : 'กลุ่มส่วนตัว'} · ${updated.memberCount} สมาชิก`;
            window.dispatchEvent(new PopStateEvent('popstate'));
          });
        });
        heroActions.append(edit);
      }
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
        el('div', { className: 'group-hero__copy' }, title, meta),
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
        const textarea = el('textarea', {
          attrs: {
            rows: '3',
            maxlength: '20000',
            placeholder: 'แชร์อะไรกับสมาชิกในกลุ่ม… พิมพ์ @ เพื่อแท็กสมาชิก',
            'aria-label': 'เขียนโพสต์ในกลุ่ม',
          },
        }) as HTMLTextAreaElement;
        const composerFooter = el('div', { className: 'group-composer__footer' });
        composerFooter.append(
          el('span', { className: 'group-composer__hint', text: 'พิมพ์ @ แล้วตามด้วยชื่อเพื่อแท็กสมาชิกในกลุ่ม' }),
        );
        const submit = el('button', { className: 'button button--primary', text: 'โพสต์', attrs: { type: 'submit' } });
        composerFooter.append(submit);
        form.append(textarea, composerFooter);
        const getMentionIds = attachGroupMentionAutocomplete(id, form, textarea);
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const content = textarea.value.trim();
          if (!content) return;
          submit.disabled = true;
          try {
            await groupsApi.createPost(id, content, getMentionIds());
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
        const postBody = el('p', { className: 'group-post__body' });
        appendGroupPostContent(postBody, post);
        feed.append(el('article', { className: 'group-post' },
          el('div', { className: 'group-post__header' },
            el('span', { className: 'community-person__avatar', text: post.author.name.charAt(0).toUpperCase() }),
            el('div', { className: 'group-post__author' },
              el('a', { attrs: { href: `/profile/${encodeURIComponent(post.author._id)}` }, text: post.author.name }),
              el('small', { text: formatRelativeTime(post.createdAt) }),
            ),
          ),
          postBody,
        ));
      }
      const nav = pager(id, tab, posts.page, posts.pages);
      if (nav) feed.append(nav);
      root.append(feed);
    } else if (tab === 'members') {
      const section = el('section', { className: 'community-sidebar group-tab-content' });
      section.append(el('h2', { text: 'สมาชิกในกลุ่ม' }));
      const memberSearch = el('form', { className: 'group-member-search' });
      const memberInput = el('input', {
        attrs: {
          type: 'search',
          placeholder: 'ค้นหาสมาชิกในกลุ่ม',
          'aria-label': 'ค้นหาสมาชิกในกลุ่ม',
        },
      }) as HTMLInputElement;
      const memberList = el('div', { className: 'group-member-list' });
      memberSearch.append(memberInput);
      section.append(memberSearch, memberList);

      const renderMembers = async (query = '') => {
        memberList.replaceChildren(el('p', { className: 'platform-meta', text: 'กำลังโหลดสมาชิก…' }));
        try {
          const members = await groupsApi.members(id, query ? 1 : page, 20, query);
          memberList.replaceChildren();
          if (!members.items.length) {
            memberList.append(el('p', { className: 'platform-state', text: query ? 'ไม่พบสมาชิกที่ค้นหา' : 'ยังไม่มีสมาชิก' }));
            return;
          }
          for (const member of members.items) {
            const user = member.user;
            memberList.append(el('a', { className: 'community-person', attrs: { href: `/profile/${encodeURIComponent(user._id)}` } },
              el('span', { className: 'community-person__avatar', text: user.name.charAt(0).toUpperCase() }),
              el('span', {}, el('strong', { text: user.name }), el('small', { text: `${member.role} · ${user.university ?? ''}` })),
            ));
          }
          if (!query) {
            const nav = pager(id, tab, members.page, members.pages);
            if (nav) memberList.append(nav);
          }
        } catch (error) {
          memberList.replaceChildren(el('p', { className: 'platform-state platform-state--error', text: errorMessage(error) }));
        }
      };

      let searchTimer = 0;
      memberInput.addEventListener('input', () => {
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(() => void renderMembers(memberInput.value.trim()), 250);
      });
      memberSearch.addEventListener('submit', (event) => {
        event.preventDefault();
        void renderMembers(memberInput.value.trim());
      });
      await renderMembers();
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

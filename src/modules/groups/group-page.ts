import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { formatRelativeTime } from '../../core/utils/format';
import { openReportDialog } from '../reports/report-dialog';
import { searchApi } from '../search/search-api';
import { groupsApi, type GroupMember } from './groups-api';

type GroupTab = 'discussion' | 'members' | 'about';

function groupHref(id: string, tab: GroupTab): string {
  return tab === 'discussion' ? `/groups/${id}` : `/groups/${id}?tab=${tab}`;
}

export async function groupPage(context: RouteContext): Promise<PageView> {
  const id = context.params.id ?? '';
  const rawTab = context.query.get('tab');
  const tab: GroupTab = rawTab === 'members' || rawTab === 'about' ? rawTab : 'discussion';
  const root = el('section', { className: 'platform-page group-detail-page' });

  try {
    let group = await groupsApi.get(id);
    const [posts, members] = await Promise.all([groupsApi.posts(id), groupsApi.members(id)]);
    const currentUserId = authStore.snapshot.user?._id ?? '';
    const canManageMembers = group.membershipRole === 'owner' || group.membershipRole === 'admin';

    const hero = el('header', { className: 'group-hero' });
    const action = el('button', {
      className: group.joined ? 'button button--secondary' : 'button button--primary',
      text: group.joined ? (group.membershipRole === 'owner' ? 'เจ้าของกลุ่ม' : 'ออกจากกลุ่ม') : 'เข้าร่วมกลุ่ม',
      attrs: { type: 'button' },
    });
    if (group.membershipRole === 'owner') action.disabled = true;
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

    if (canManageMembers) {
      const addMember = el('button', {
        className: 'button button--secondary',
        text: '+ เพิ่มสมาชิก',
        attrs: { type: 'button' },
      });
      addMember.addEventListener('click', async () => {
        const q = window.prompt('ค้นหาสมาชิกด้วยชื่อหรือ username');
        if (!q?.trim()) return;
        try {
          const result = await searchApi.search(q.trim());
          const existing = new Set(members.map((member) => member.user._id));
          const candidates = result.users.filter((user) => user.id !== currentUserId && !existing.has(user.id));
          if (!candidates.length) {
            toast.info('ไม่พบผู้ใช้ที่สามารถเพิ่มได้');
            return;
          }
          let selected = candidates[0];
          if (candidates.length > 1) {
            const choice = window.prompt(candidates.slice(0, 10).map((user, index) =>
              `${index + 1}. ${user.name} (${user.university})`).join('\n') + '\n\nเลือกหมายเลข', '1');
            const index = Number(choice) - 1;
            if (!Number.isInteger(index) || index < 0 || index >= Math.min(candidates.length, 10)) return;
            selected = candidates[index];
          }
          if (!selected) return;
          await groupsApi.addMember(id, selected.id);
          toast.success(`เพิ่ม ${selected.name} เข้ากลุ่มแล้ว`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (error) {
          toast.error(errorMessage(error));
        }
      });
      heroActions.append(addMember);
    }

    if (group.membershipRole === 'owner') {
      const deleteGroup = el('button', {
        className: 'button button--secondary',
        text: 'ลบกลุ่ม',
        attrs: { type: 'button' },
      });
      deleteGroup.addEventListener('click', async () => {
        if (!window.confirm(`ลบกลุ่ม “${group.name}” และโพสต์ทั้งหมดในกลุ่ม?`)) return;
        deleteGroup.disabled = true;
        try {
          await groupsApi.delete(id);
          toast.success('ลบกลุ่มแล้ว');
          window.history.pushState(null, '', '/groups');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (error) {
          toast.error(errorMessage(error));
          deleteGroup.disabled = false;
        }
      });
      heroActions.append(deleteGroup);
    }

    if (authStore.snapshot.status === 'authenticated') {
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
      { id: 'discussion' as const, label: 'การสนทนา' },
      { id: 'members' as const, label: 'สมาชิก' },
      { id: 'about' as const, label: 'เกี่ยวกับ' },
    ]) {
      tabs.append(el('a', {
        className: `community-tab${tab === item.id ? ' community-tab--active' : ''}`,
        text: item.label,
        attrs: { href: groupHref(id, item.id), ...(tab === item.id ? { 'aria-current': 'page' } : {}) },
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

    const layout = el('div', { className: 'community-layout' });
    const main = el('div', { className: 'community-feed' });
    const sidebar = el('aside', { className: 'community-sidebar' });

    if (tab === 'discussion') {
      main.append(el('h2', { text: 'โพสต์ในกลุ่ม' }));

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
            window.dispatchEvent(new PopStateEvent('popstate'));
          } catch (error) {
            toast.error(errorMessage(error));
            submit.disabled = false;
          }
        });
        main.append(form);
      }

      if (!posts.length) main.append(el('div', { className: 'platform-state', text: 'ยังไม่มีโพสต์ในกลุ่ม' }));
      for (const post of posts) {
        const card = el('article', { className: 'group-post' });
        card.append(
          el('div', { className: 'group-post__header' },
            el('span', { className: 'community-person__avatar', text: post.author.name.charAt(0).toUpperCase() }),
            el('div', {}, el('strong', { text: post.author.name }), el('small', { text: formatRelativeTime(post.createdAt) })),
          ),
          el('p', { text: post.content }),
        );

        const postActions = el('div', { className: 'group-post__actions' });
        const canDelete = currentUserId === post.author._id
          || group.membershipRole === 'owner'
          || group.membershipRole === 'admin'
          || group.membershipRole === 'moderator';
        if (canDelete) {
          const remove = el('button', { className: 'button button--secondary button--small', text: 'ลบ', attrs: { type: 'button' } });
          remove.addEventListener('click', async () => {
            if (!window.confirm('ลบโพสต์นี้?')) return;
            remove.disabled = true;
            try {
              await groupsApi.deletePost(id, post.id);
              card.remove();
            } catch (error) {
              toast.error(errorMessage(error));
              remove.disabled = false;
            }
          });
          postActions.append(remove);
        }
        if (authStore.snapshot.status === 'authenticated') {
          const report = el('button', { className: 'button button--secondary button--small', text: 'รายงาน', attrs: { type: 'button' } });
          report.addEventListener('click', () => openReportDialog({
            targetType: 'group_post',
            targetId: post.id,
            title: 'รายงานโพสต์ในกลุ่ม',
          }));
          postActions.append(report);
        }
        if (postActions.childElementCount) card.append(postActions);
        main.append(card);
      }

      sidebar.append(el('h2', { text: 'เกี่ยวกับกลุ่ม' }), el('p', { text: group.description || 'ยังไม่มีคำอธิบายกลุ่ม' }));
    } else if (tab === 'members') {
      main.append(el('h2', { text: `สมาชิก ${members.length} คน` }));
      const list = el('div', { className: 'group-member-list' });

      for (const member of members) {
        const row = el('div', { className: 'group-member-row' });
        row.append(
          el('span', { className: 'community-person__avatar', text: member.user.name.charAt(0).toUpperCase() }),
          el('div', { className: 'group-member-row__identity' },
            el('strong', { text: member.user.name }),
            el('small', { text: `${member.user.university ?? ''} · ${member.role}` }),
          ),
        );

        const controls = el('div', { className: 'group-member-row__controls' });
        if (group.membershipRole === 'owner' && member.role !== 'owner') {
          const select = el('select', { attrs: { 'aria-label': `บทบาทของ ${member.user.name}` } });
          for (const role of ['member', 'moderator', 'admin', 'owner'] as GroupMember['role'][]) {
            const option = el('option', { text: role, attrs: { value: role } });
            if (member.role === role) option.selected = true;
            select.append(option);
          }
          select.addEventListener('change', async () => {
            const nextRole = select.value as GroupMember['role'];
            if (nextRole === 'owner' && !window.confirm(`โอนสิทธิ์เจ้าของกลุ่มให้ ${member.user.name}?`)) {
              select.value = member.role;
              return;
            }
            select.disabled = true;
            try {
              await groupsApi.setMemberRole(id, member.user._id, nextRole);
              toast.success('อัปเดตบทบาทแล้ว');
              window.dispatchEvent(new PopStateEvent('popstate'));
            } catch (error) {
              toast.error(errorMessage(error));
              select.value = member.role;
              select.disabled = false;
            }
          });
          controls.append(select);
        }

        const canRemove = member.role !== 'owner'
          && member.user._id !== currentUserId
          && (group.membershipRole === 'owner' || (group.membershipRole === 'admin' && member.role === 'member'));
        if (canRemove) {
          const remove = el('button', { className: 'button button--secondary button--small', text: 'นำออก', attrs: { type: 'button' } });
          remove.addEventListener('click', async () => {
            if (!window.confirm(`นำ ${member.user.name} ออกจากกลุ่ม?`)) return;
            remove.disabled = true;
            try {
              await groupsApi.removeMember(id, member.user._id);
              row.remove();
              toast.success('นำสมาชิกออกแล้ว');
            } catch (error) {
              toast.error(errorMessage(error));
              remove.disabled = false;
            }
          });
          controls.append(remove);
        }

        row.append(controls);
        list.append(row);
      }
      main.append(list);
      sidebar.append(el('h2', { text: 'สิทธิ์ในกลุ่ม' }), el('p', { text: 'Owner จัดการบทบาทได้, Admin เพิ่ม/นำสมาชิกทั่วไปออกได้, Moderator จัดการโพสต์ได้' }));
    } else {
      main.append(
        el('h2', { text: 'เกี่ยวกับ' }),
        el('dl', { className: 'profile-detail-list' },
          el('dt', { text: 'ชื่อกลุ่ม' }), el('dd', { text: group.name }),
          el('dt', { text: 'ประเภท' }), el('dd', { text: group.privacy === 'public' ? 'สาธารณะ' : 'ส่วนตัว' }),
          el('dt', { text: 'สถาบัน' }), el('dd', { text: group.university ?? 'ทุกสถาบัน' }),
          el('dt', { text: 'สมาชิก' }), el('dd', { text: `${group.memberCount} คน` }),
          el('dt', { text: 'รายละเอียด' }), el('dd', { text: group.description || 'ยังไม่มีคำอธิบาย' }),
        ),
      );
      sidebar.append(el('h2', { text: 'ผู้ดูแล' }));
      for (const member of members.filter((item) => item.role !== 'member')) {
        sidebar.append(el('div', { className: 'community-person' },
          el('span', { className: 'community-person__avatar', text: member.user.name.charAt(0).toUpperCase() }),
          el('span', {}, el('strong', { text: member.user.name }), el('small', { text: member.role })),
        ));
      }
    }

    layout.append(main, sidebar);
    root.append(hero, layout);
  } catch (error) {
    root.append(el('div', { className: 'platform-state platform-state--error', text: errorMessage(error) }));
  }

  return { title: 'กลุ่ม', element: root };
}

import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { formatRelativeTime } from '../../core/utils/format';
import { groupsApi } from './groups-api';
import { openReportDialog } from '../reports/report-dialog';

export async function groupPage(context: RouteContext): Promise<PageView> {
  const id = context.params.id ?? '';
  const root = el('section', { className: 'platform-page group-detail-page' });

  try {
    let group = await groupsApi.get(id);
    const [posts, members] = await Promise.all([groupsApi.posts(id), groupsApi.members(id)]);

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

    hero.append(
      el('div', { className: 'group-hero__cover' }),
      el('div', { className: 'group-hero__content' },
        el('div', {},
          el('h1', { text: group.name }),
          el('p', { text: `${group.privacy === 'public' ? 'กลุ่มสาธารณะ' : 'กลุ่มส่วนตัว'} · ${group.memberCount} สมาชิก` }),
        ),
        heroActions,
      ),
      el('nav', { className: 'community-tabs' },
        el('span', { className: 'community-tab community-tab--active', text: 'การสนทนา' }),
        el('span', { className: 'community-tab', text: 'สมาชิก' }),
        el('span', { className: 'community-tab', text: 'เกี่ยวกับ' }),
      ),
    );

    const layout = el('div', { className: 'community-layout' });
    const feed = el('div', { className: 'community-feed' });
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
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (error) {
          toast.error(errorMessage(error));
          submit.disabled = false;
        }
      });
      feed.append(form);
    }

    if (!posts.length) feed.append(el('div', { className: 'platform-state', text: 'ยังไม่มีโพสต์ในกลุ่ม' }));
    for (const post of posts) {
      feed.append(el('article', { className: 'group-post' },
        el('div', { className: 'group-post__header' },
          el('span', { className: 'community-person__avatar', text: post.author.name.charAt(0).toUpperCase() }),
          el('div', {}, el('strong', { text: post.author.name }), el('small', { text: formatRelativeTime(post.createdAt) })),
        ),
        el('p', { text: post.content }),
      ));
    }

    const sidebar = el('aside', { className: 'community-sidebar' });
    sidebar.append(
      el('h2', { text: 'ผู้ดูแลและสมาชิก' }),
      el('p', { text: group.description || 'ยังไม่มีคำอธิบายกลุ่ม' }),
    );
    for (const member of members.slice(0, 10)) {
      const user = member.user as { _id?: string; name?: string; university?: string };
      if (!user?.name) continue;
      sidebar.append(el('div', { className: 'community-person' },
        el('span', { className: 'community-person__avatar', text: user.name.charAt(0).toUpperCase() }),
        el('span', {}, el('strong', { text: user.name }), el('small', { text: `${member.role} · ${user.university ?? ''}` })),
      ));
    }

    layout.append(feed, sidebar);
    root.append(hero, layout);
  } catch (error) {
    root.append(el('div', { className: 'platform-state platform-state--error', text: errorMessage(error) }));
  }

  return { title: 'กลุ่ม', element: root };
}

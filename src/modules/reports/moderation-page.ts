import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { reportsApi, type ReportStatus } from './reports-api';

const reasonLabels: Record<string, string> = {
  spam: 'Spam',
  harassment: 'การคุกคาม',
  inappropriate: 'เนื้อหาไม่เหมาะสม',
  fake_account: 'บัญชีปลอม',
  scam: 'หลอกลวง',
  other: 'อื่น ๆ',
};

const statusLabels: Record<ReportStatus, string> = {
  pending: 'รอดำเนินการ',
  resolved: 'ดำเนินการแล้ว',
  dismissed: 'ยกเลิกแล้ว',
};

export async function moderationPage(context: RouteContext): Promise<PageView> {
  const root = el('section', { className: 'platform-page moderation-page' });
  root.append(el('h1', { className: 'platform-title', text: 'Reports — Moderation' }));

  if (authStore.snapshot.user?.role !== 'admin') {
    root.append(el('div', { className: 'platform-state platform-state--error', text: 'หน้านี้สำหรับผู้ดูแลระบบเท่านั้น' }));
    return { title: 'การดูแลระบบ', element: root };
  }

  const raw = context.query.get('status');
  const status: ReportStatus = raw === 'resolved' || raw === 'dismissed' ? raw : 'pending';
  const tabs = el('nav', { className: 'moderation-tabs' });
  for (const value of ['pending', 'resolved', 'dismissed'] as ReportStatus[]) {
    tabs.append(el('a', {
      className: `community-tab${status === value ? ' community-tab--active' : ''}`,
      text: statusLabels[value],
      attrs: { href: value === 'pending' ? '/admin/moderation' : `/admin/moderation?status=${value}` },
    }));
  }
  root.append(tabs);

  const queue = el('div', { className: 'moderation-queue' });
  root.append(queue);

  try {
    const reports = await reportsApi.list(status);
    if (!reports.length) queue.append(el('div', { className: 'platform-state', text: `ไม่มีรายงานสถานะ “${statusLabels[status]}”` }));
    for (const report of reports) {
      const card = el('article', { className: 'moderation-card' });
      const actions = el('div', { className: 'moderation-actions' });

      const run = (label: string, action: 'dismiss' | 'remove_content' | 'suspend_user' | 'restore_user') => {
        const button = el('button', {
          className: action === 'dismiss' ? 'button button--secondary' : 'button button--primary',
          text: label,
          attrs: { type: 'button' },
        });
        button.addEventListener('click', async () => {
          const note = window.prompt('บันทึกผู้ดูแล (ไม่บังคับ)', '') ?? '';
          button.disabled = true;
          try {
            await reportsApi.moderate(report._id, action, note);
            toast.success(action === 'restore_user' ? 'คืนสถานะบัญชีแล้ว' : 'ดำเนินการรายงานแล้ว');
            window.dispatchEvent(new PopStateEvent('popstate'));
          } catch (error) {
            toast.error(errorMessage(error));
            button.disabled = false;
          }
        });
        return button;
      };

      if (status === 'pending') {
        actions.append(run('ยกเลิกการรายงาน', 'dismiss'));
        if (report.targetType === 'post' || report.targetType === 'comment' || report.targetType === 'group' || report.targetType === 'group_post') {
          actions.append(run('ลบเนื้อหา', 'remove_content'));
        }
        if (report.targetType === 'user') actions.append(run('ระงับบัญชี', 'suspend_user'));
      } else if (status === 'resolved' && report.targetType === 'user' && report.action === 'suspend_user') {
        actions.append(run('คืนสถานะบัญชี', 'restore_user'));
      }

      card.append(
        el('div', { className: 'moderation-card__header' },
          el('strong', { text: reasonLabels[report.reason] ?? report.reason }),
          el('span', { className: 'platform-meta', text: `${report.targetType} · ${report.targetId}` }),
        ),
        el('p', { text: report.details || 'ไม่มีรายละเอียดเพิ่มเติม' }),
        el('small', { text: `รายงานโดย ${report.reporter?.name ?? 'ผู้ใช้'} · ${statusLabels[report.status]}` }),
      );
      if (report.note) card.append(el('p', { className: 'platform-meta', text: `บันทึกผู้ดูแล: ${report.note}` }));
      if (actions.childElementCount) card.append(actions);
      queue.append(card);
    }
  } catch (error) {
    queue.append(el('div', { className: 'platform-state platform-state--error', text: errorMessage(error) }));
  }

  return { title: 'การดูแลระบบ', element: root };
}

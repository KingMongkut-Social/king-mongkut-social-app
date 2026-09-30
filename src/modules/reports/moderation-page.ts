import { authStore } from '../../core/auth/auth-store';
import type { PageView } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { reportsApi } from './reports-api';

const reasonLabels: Record<string, string> = {
  spam: 'Spam',
  harassment: 'การคุกคาม',
  inappropriate: 'เนื้อหาไม่เหมาะสม',
  fake_account: 'บัญชีปลอม',
  scam: 'หลอกลวง',
  other: 'อื่น ๆ',
};

export async function moderationPage(): Promise<PageView> {
  const root = el('section', { className: 'platform-page moderation-page' });
  root.append(el('h1', { className: 'platform-title', text: 'Reports — Moderation' }));

  if (authStore.snapshot.user?.role !== 'admin') {
    root.append(el('div', { className: 'platform-state platform-state--error', text: 'หน้านี้สำหรับผู้ดูแลระบบเท่านั้น' }));
    return { title: 'การดูแลระบบ', element: root };
  }

  const queue = el('div', { className: 'moderation-queue' });
  root.append(queue);

  try {
    const reports = await reportsApi.list();
    if (!reports.length) queue.append(el('div', { className: 'platform-state', text: 'ไม่มีรายงานที่รอดำเนินการ' }));
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
            toast.success('ดำเนินการรายงานแล้ว');
            card.remove();
          } catch (error) {
            toast.error(errorMessage(error));
            button.disabled = false;
          }
        });
        return button;
      };

      actions.append(run('ยกเลิกการรายงาน', 'dismiss'));
      if (report.targetType === 'post' || report.targetType === 'comment' || report.targetType === 'group') {
        actions.append(run('ลบเนื้อหา', 'remove_content'));
      }
      if (report.targetType === 'user') {
        actions.append(run('ระงับบัญชี', 'suspend_user'), run('คืนสถานะบัญชี', 'restore_user'));
      }

      card.append(
        el('div', { className: 'moderation-card__header' },
          el('strong', { text: reasonLabels[report.reason] ?? report.reason }),
          el('span', { className: 'platform-meta', text: `${report.targetType} · ${report.targetId}` }),
        ),
        el('p', { text: report.details || 'ไม่มีรายละเอียดเพิ่มเติม' }),
        el('small', { text: `รายงานโดย ${report.reporter?.name ?? 'ผู้ใช้'}` }),
        actions,
      );
      queue.append(card);
    }
  } catch (error) {
    queue.append(el('div', { className: 'platform-state platform-state--error', text: errorMessage(error) }));
  }

  return { title: 'การดูแลระบบ', element: root };
}

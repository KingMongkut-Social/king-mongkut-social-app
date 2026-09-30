import { requireMember } from '../../core/auth/auth-navigation';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { reportsApi, type ReportReason, type ReportTarget } from './reports-api';

const reasons: ReadonlyArray<{ value: ReportReason; label: string }> = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'การคุกคาม' },
  { value: 'inappropriate', label: 'เนื้อหาไม่เหมาะสม' },
  { value: 'fake_account', label: 'บัญชีปลอม' },
  { value: 'scam', label: 'หลอกลวง' },
  { value: 'other', label: 'อื่น ๆ' },
];

export function openReportDialog(options: {
  targetType: ReportTarget;
  targetId: string;
  title?: string;
}): void {
  if (!requireMember()) return;

  const dialog = el('dialog', { className: 'report-dialog' });
  const form = el('form', { className: 'report-dialog__form' });
  const heading = el('h2', { text: options.title ?? 'รายงานเนื้อหา' });
  const help = el('p', { className: 'report-dialog__help', text: 'เลือกเหตุผลที่ใกล้เคียงที่สุด' });
  const reasonList = el('div', { className: 'report-dialog__reasons' });

  for (const [index, reason] of reasons.entries()) {
    const radio = el('input', {
      attrs: {
        type: 'radio',
        name: 'reason',
        value: reason.value,
        ...(index === 0 ? { checked: 'checked' } : {}),
      },
    });
    reasonList.append(el('label', { className: 'report-dialog__reason' }, radio, el('span', { text: reason.label })));
  }

  const detailsLabel = el('label', { className: 'report-dialog__details-label', text: 'รายละเอียดเพิ่มเติม' });
  const details = el('textarea', {
    attrs: {
      rows: '4',
      maxlength: '2000',
      placeholder: 'อธิบายเพิ่มเติม...',
    },
  });
  const status = el('p', { className: 'report-dialog__status', attrs: { role: 'alert' } });
  const actions = el('div', { className: 'report-dialog__actions' });
  const cancel = el('button', {
    className: 'button button--secondary',
    text: 'ยกเลิก',
    attrs: { type: 'button' },
  });
  const submit = el('button', {
    className: 'button button--primary',
    text: 'ส่งรายงาน',
    attrs: { type: 'submit' },
  });

  cancel.addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const selected = form.querySelector<HTMLInputElement>('input[name="reason"]:checked');
    if (!selected) return;
    submit.disabled = true;
    status.textContent = '';
    try {
      await reportsApi.create({
        targetType: options.targetType,
        targetId: options.targetId,
        reason: selected.value as ReportReason,
        details: details.value.trim(),
      });
      toast.success('ส่งรายงานแล้ว ขอบคุณที่ช่วยดูแลชุมชน');
      dialog.close();
    } catch (error) {
      status.textContent = errorMessage(error);
      submit.disabled = false;
    }
  });

  actions.append(cancel, submit);
  form.append(heading, help, reasonList, detailsLabel, details, status, actions);
  dialog.append(form);
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
}

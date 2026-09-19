import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { postSchema } from '../../validation/schemas';
import { clearFieldErrors, field, showZodErrors } from '../shared/form';
import { postsApi } from './posts-api';

export async function postEditorPage(context: RouteContext): Promise<PageView> {
  const id = context.params.id;
  const editing = Boolean(id);
  const existing = id ? (await postsApi.getById(id)).data.post : null;

  const section = el('section', { className: 'page-shell page-shell--narrow' });
  const heading = el('div', { className: 'editor-heading' },
    el('div', {},
      el('p', { className: 'eyebrow', text: editing ? 'แก้ไขโพสต์' : 'สร้างโพสต์ใหม่' }),
      el('h1', { text: editing ? 'อัปเดตโพสต์ของคุณ' : 'แบ่งปันโปรเจกต์และไอเดียของคุณ' }),
      el('p', { className: 'muted', text: 'บันทึกเป็นแบบร่างหรือเผยแพร่สู่ชาว 3 พระจอมฯ ทันที' }),
    ),
  );

  const form = el('form', { className: 'form editor-form', attrs: { novalidate: 'true' } });
  const title = el('input', {
    className: 'input',
    attrs: { id: 'title', name: 'title', type: 'text', maxlength: '150', placeholder: 'ระบุหัวข้อโพสต์หรือชื่อโปรเจกต์...', required: 'true', value: existing?.title ?? '' },
  });
  const content = el('textarea', {
    className: 'input textarea',
    attrs: { id: 'content', name: 'content', maxlength: '20000', placeholder: 'เขียนรายละเอียดโปรเจกต์, ความคืบหน้า, สิ่งที่ต้องการแชร์...', required: 'true', rows: '14' },
  });
  content.value = existing?.content ?? '';
  const status = el('select', { className: 'input', attrs: { id: 'status', name: 'status' } });
  const draft = el('option', { text: 'แบบร่าง (Draft)', attrs: { value: 'draft' } });
  const published = el('option', { text: 'เผยแพร่สู่สาธารณะ (Published)', attrs: { value: 'published' } });
  status.append(draft, published);
  status.value = existing?.status ?? 'draft';

  const formError = el('p', { className: 'form-error', attrs: { role: 'alert' } });
  const actions = el('div', { className: 'form-actions' });
  const cancel = el('a', { className: 'button button--ghost', text: 'ยกเลิก', attrs: { href: '/dashboard' } });
  const submit = el('button', {
    className: 'button button--primary',
    text: editing ? 'บันทึกการเปลี่ยนแปลง' : 'เผยแพร่โพสต์',
    attrs: { type: 'submit' },
  });
  actions.append(cancel, submit);

  form.append(
    field('title', 'หัวข้อโพสต์', title, 'ความยาวไม่เกิน 150 ตัวอักษร'),
    field('content', 'เนื้อหาโพสต์', content, 'ข้อความบรรยาย ไม่เกิน 20,000 ตัวอักษร'),
    field('status', 'สถานะการเผยแพร่', status),
    formError,
    actions,
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    formError.textContent = '';

    const result = postSchema.safeParse({ title: title.value, content: content.value, status: status.value });
    if (!result.success) {
      showZodErrors(form, result.error);
      return;
    }

    submit.disabled = true;
    submit.textContent = 'กำลังบันทึก…';
    try {
      if (id) await postsApi.update(id, result.data);
      else await postsApi.create(result.data);
      toast.success(id ? 'อัปเดตโพสต์เรียบร้อย' : 'สร้างโพสต์เรียบร้อย');
      window.history.pushState(null, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      formError.textContent = errorMessage(error);
      submit.disabled = false;
      submit.textContent = editing ? 'บันทึกการเปลี่ยนแปลง' : 'เผยแพร่โพสต์';
    }
  });

  section.append(heading, form);
  return { title: editing ? 'แก้ไขโพสต์' : 'สร้างโพสต์ใหม่', element: section };
}

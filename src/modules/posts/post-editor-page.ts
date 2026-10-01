import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { reactIcon } from '../../core/ui/react-icon';
import type { PostAttachment } from '../../types/api';
import { postSchema } from '../../validation/schemas';
import { clearFieldErrors, field, showZodErrors } from '../shared/form';
import { assetUrl, postsApi } from './posts-api';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGES = 4;
const MAX_ATTACHMENTS = 5;

export async function postEditorPage(context: RouteContext): Promise<PageView> {
  const id = context.params.id;
  const editing = Boolean(id);
  const existing = id ? (await postsApi.getById(id)).data.post : null;

  const section = el('section', { className: 'page-shell page-shell--narrow' });
  const backLink = el('a', {
    className: 'editor-back-link',
    attrs: {
      href: editing ? '/dashboard' : '/',
      'aria-label': 'ย้อนกลับ',
      title: 'ย้อนกลับ',
    },
  });
  backLink.append(reactIcon('arrow-left'));
  const heading = el('div', { className: 'editor-heading' },
    backLink,
    el('div', { className: 'editor-heading__copy' },
      el('p', { className: 'eyebrow', text: editing ? 'แก้ไขโพสต์' : 'สร้างโพสต์ใหม่' }),
      el('h1', { text: editing ? 'แก้ไขโพสต์' : 'สร้างโพสต์' }),
      el('p', { className: 'muted', text: 'เขียน แชร์รูปภาพ และเลือกเผยแพร่หรือบันทึกเป็นแบบร่าง' }),
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

  const images = [...(existing?.images?.length ? existing.images : existing?.coverImage ? [existing.coverImage] : [])];
  const attachments: PostAttachment[] = [...(existing?.attachments ?? [])];
  const newImages: File[] = [];
  const newAttachments: File[] = [];

  const imageInput = el('input', {
    className: 'input',
    attrs: { id: 'images', name: 'images', type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', multiple: 'true' },
  });
  const attachmentInput = el('input', {
    className: 'input',
    attrs: { id: 'attachments', name: 'attachments', type: 'file', accept: '.pdf,.txt,.doc,.docx', multiple: 'true' },
  });
  const imageList = el('div', { className: 'editor-media-list', attrs: { 'aria-live': 'polite' } });
  const attachmentList = el('div', { className: 'editor-media-list', attrs: { 'aria-live': 'polite' } });

  const mediaRow = (label: string, remove: () => void, imageUrl?: string): HTMLElement => {
    const row = el('div', { className: 'editor-media-row' });
    if (imageUrl) {
      row.append(el('img', { attrs: { src: assetUrl(imageUrl), alt: label, width: '64', height: '48', style: 'object-fit: cover; border-radius: 8px;' } }));
    }
    row.append(el('span', { text: label }));
    const removeButton = el('button', { className: 'button button--small button--ghost', text: 'ลบ', attrs: { type: 'button', 'aria-label': `ลบ ${label}` } });
    removeButton.addEventListener('click', remove);
    row.append(removeButton);
    return row;
  };

  const renderMedia = (): void => {
    imageList.replaceChildren(
      ...images.map((url, index) => mediaRow(`รูปภาพ ${index + 1}`, () => {
        images.splice(index, 1);
        renderMedia();
      }, url)),
      ...newImages.map((file, index) => mediaRow(file.name, () => {
        newImages.splice(index, 1);
        renderMedia();
      })),
    );
    attachmentList.replaceChildren(
      ...attachments.map((asset, index) => mediaRow(asset.name, () => {
        attachments.splice(index, 1);
        renderMedia();
      })),
      ...newAttachments.map((file, index) => mediaRow(file.name, () => {
        newAttachments.splice(index, 1);
        renderMedia();
      })),
    );
  };

  const selectFiles = (input: HTMLInputElement, target: File[], currentCount: number, maxCount: number, imageOnly: boolean): void => {
    const selected = Array.from(input.files ?? []);
    if (currentCount + selected.length > maxCount) {
      toast.error(`เลือกไฟล์ได้สูงสุด ${maxCount} ไฟล์`);
      input.value = '';
      return;
    }
    for (const file of selected) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`ไฟล์ ${file.name} มีขนาดเกิน 10 MB`);
        input.value = '';
        return;
      }
      if (imageOnly && !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast.error('รองรับเฉพาะไฟล์รูป JPEG, PNG, WebP หรือ GIF');
        input.value = '';
        return;
      }
    }
    target.push(...selected);
    input.value = '';
    renderMedia();
  };

  imageInput.addEventListener('change', () => selectFiles(imageInput, newImages, images.length + newImages.length, MAX_IMAGES, true));
  attachmentInput.addEventListener('change', () => selectFiles(attachmentInput, newAttachments, attachments.length + newAttachments.length, MAX_ATTACHMENTS, false));
  renderMedia();

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
    field('images', 'รูปภาพ', imageInput, `เลือกได้สูงสุด ${MAX_IMAGES} รูป รูปละไม่เกิน 10 MB`),
    imageList,
    field('attachments', 'ไฟล์แนบ', attachmentInput, `เลือกได้สูงสุด ${MAX_ATTACHMENTS} ไฟล์ ไฟล์ละไม่เกิน 10 MB`),
    attachmentList,
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
    if (!result.data.content && images.length + newImages.length + attachments.length + newAttachments.length === 0) {
      formError.textContent = 'กรุณาเพิ่มข้อความ รูปภาพ หรือไฟล์แนบก่อนบันทึกโพสต์';
      return;
    }

    submit.disabled = true;
    submit.textContent = 'กำลังบันทึก…';
    try {
      const uploadedImages = [...images];
      const uploadedAttachments = [...attachments];
      for (const file of newImages) {
        const response = await postsApi.upload(file);
        uploadedImages.push(response.data.asset.url);
      }
      for (const file of newAttachments) {
        const response = await postsApi.upload(file);
        uploadedAttachments.push(response.data.asset);
      }
      const input = {
        ...result.data,
        images: uploadedImages,
        attachments: uploadedAttachments,
        coverImage: uploadedImages[0] ?? null,
      };
      if (id) await postsApi.update(id, input);
      else await postsApi.create(input);
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

import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { groupsApi } from './groups-api';

function validPage(value: string | null): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function groupsHref(page: number, q: string): string {
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (page > 1) query.set('page', String(page));
  return query.size ? `/groups?${query}` : '/groups';
}

function pager(page: number, pages: number, q: string): HTMLElement | null {
  if (pages <= 1) return null;
  const nav = el('nav', { className: 'pagination', attrs: { 'aria-label': 'หน้ารายการกลุ่ม' } });
  if (page > 1) nav.append(el('a', {
    className: 'button button--secondary button--small',
    text: '← ก่อนหน้า',
    attrs: { href: groupsHref(page - 1, q) },
  }));
  nav.append(el('span', { className: 'platform-meta', text: `หน้า ${page} / ${pages}` }));
  if (page < pages) nav.append(el('a', {
    className: 'button button--secondary button--small',
    text: 'ถัดไป →',
    attrs: { href: groupsHref(page + 1, q) },
  }));
  return nav;
}

function createGroupDialog(): HTMLDialogElement {
  const dialog = el('dialog', { className: 'platform-dialog group-create-dialog' });
  const form = el('form', { className: 'platform-dialog__form' });
  const name = el('input', {
    className: 'input',
    attrs: { id: 'create-group-name', name: 'name', type: 'text', minlength: '2', maxlength: '100', required: 'true', placeholder: 'ชื่อกลุ่ม' },
  });
  const description = el('textarea', {
    className: 'input textarea',
    attrs: { id: 'create-group-desc', name: 'description', maxlength: '2000', rows: '4', placeholder: 'รายละเอียดกลุ่ม' },
  });
  const privacy = el('select', { className: 'input', attrs: { id: 'create-group-privacy', name: 'privacy', 'aria-label': 'ความเป็นส่วนตัว' } });
  privacy.append(
    el('option', { text: 'กลุ่มสาธารณะ — ทุกคนเข้าร่วมได้', attrs: { value: 'public' } }),
    el('option', { text: 'กลุ่มส่วนตัว — ต้องได้รับคำเชิญ', attrs: { value: 'private' } }),
  );
  const university = el('select', { className: 'input', attrs: { id: 'create-group-univ', name: 'university', 'aria-label': 'สถาบัน' } });
  university.append(el('option', { text: 'ทุกสถาบัน', attrs: { value: '' } }));
  for (const code of ['KMITL', 'KMUTT', 'KMUTNB'] as const) {
    const option = el('option', { text: code, attrs: { value: code } });
    if (authStore.snapshot.user?.university === code) option.selected = true;
    university.append(option);
  }
  const status = el('p', { className: 'form-error', attrs: { role: 'alert' } });
  const submit = el('button', { className: 'button button--primary', text: 'สร้างกลุ่ม', attrs: { type: 'submit' } });
  const cancel = el('button', { className: 'button button--secondary', text: 'ยกเลิก', attrs: { type: 'button' } });
  cancel.addEventListener('click', () => dialog.close());

  form.append(
    el('h2', { text: 'สร้างกลุ่มชุมชน' }),
    el('label', { text: 'ชื่อกลุ่ม', attrs: { for: 'create-group-name' } }), name,
    el('label', { text: 'รายละเอียด', attrs: { for: 'create-group-desc' } }), description,
    el('label', { text: 'ความเป็นส่วนตัว', attrs: { for: 'create-group-privacy' } }), privacy,
    el('label', { text: 'สถาบัน', attrs: { for: 'create-group-univ' } }), university,
    status,
    el('div', { className: 'platform-dialog__actions' }, cancel, submit),
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const groupName = name.value.trim();
    if (groupName.length < 2) {
      status.textContent = 'ชื่อกลุ่มต้องมีอย่างน้อย 2 ตัวอักษร';
      return;
    }
    submit.disabled = true;
    status.textContent = '';
    try {
      const group = await groupsApi.create({
        name: groupName,
        description: description.value.trim(),
        privacy: privacy.value === 'private' ? 'private' : 'public',
        university: university.value === 'KMITL' || university.value === 'KMUTT' || university.value === 'KMUTNB'
          ? university.value
          : null,
      });
      dialog.close();
      window.history.pushState(null, '', `/groups/${group.id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      status.textContent = errorMessage(error);
      submit.disabled = false;
    }
  });

  dialog.append(form);
  return dialog;
}

export async function groupsPage(context: RouteContext): Promise<PageView> {
  const q = context.query.get('q')?.trim() ?? '';
  const page = validPage(context.query.get('page'));
  const root = el('section', { className: 'platform-page groups-page' });
  const header = el('div', { className: 'platform-heading-row' });
  header.append(
    el('div', {}, el('p', { className: 'eyebrow', text: 'ชุมชน' }), el('h1', { className: 'platform-title', text: 'กลุ่ม' })),
  );

  if (authStore.snapshot.status === 'authenticated') {
    const createButton = el('button', { className: 'button button--primary', text: '+ สร้างกลุ่ม', attrs: { type: 'button' } });
    const dialog = createGroupDialog();
    createButton.addEventListener('click', () => dialog.showModal());
    header.append(createButton);
    root.append(dialog);
  }
  root.prepend(header);

  if (authStore.snapshot.status === 'authenticated') {
    try {
      const invitations = await groupsApi.invitations();
      if (invitations.length) {
        const section = el('section', { className: 'group-invitations' });
        section.append(el('h2', { text: 'คำเชิญเข้าร่วมกลุ่ม' }));
        for (const invitation of invitations) {
          const card = el('article', { className: 'platform-card group-invitation-card' });
          const actions = el('div', { className: 'group-invitation-actions' });
          const accept = el('button', { className: 'button button--primary button--small', text: 'เข้าร่วม', attrs: { type: 'button' } });
          const reject = el('button', { className: 'button button--secondary button--small', text: 'ปฏิเสธ', attrs: { type: 'button' } });
          const respond = async (action: 'accept' | 'reject') => {
            accept.disabled = true;
            reject.disabled = true;
            try {
              await groupsApi.respondInvitation(invitation.id, action);
              toast.success(action === 'accept' ? 'เข้าร่วมกลุ่มแล้ว' : 'ปฏิเสธคำเชิญแล้ว');
              if (action === 'accept') {
                window.history.pushState(null, '', `/groups/${invitation.group.id}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
              } else {
                card.remove();
              }
            } catch (error) {
              toast.error(errorMessage(error));
              accept.disabled = false;
              reject.disabled = false;
            }
          };
          accept.addEventListener('click', () => void respond('accept'));
          reject.addEventListener('click', () => void respond('reject'));
          actions.append(accept, reject);
          card.append(
            el('h3', { text: invitation.group.name }),
            el('p', { text: invitation.group.description || 'กลุ่มส่วนตัว' }),
            el('div', { className: 'platform-meta', text: `เชิญโดย ${invitation.invitedBy?.name ?? 'สมาชิกกลุ่ม'}` }),
            actions,
          );
          section.append(card);
        }
        root.append(section);
      }
    } catch (error) {
      root.append(el('div', { className: 'platform-state platform-state--error', text: `ไม่สามารถโหลดคำเชิญได้: ${errorMessage(error)}` }));
    }
  }

  const search = el('form', { className: 'platform-search' });
  const input = el('input', { attrs: { type: 'search', name: 'q', value: q, placeholder: 'ค้นหากลุ่ม...' } });
  search.append(input, el('button', { className: 'button button--secondary', text: 'ค้นหา', attrs: { type: 'submit' } }));
  search.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim();
    window.history.pushState(null, '', groupsHref(1, value));
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  root.append(search);

  const grid = el('div', { className: 'platform-card-grid' });
  root.append(grid);
  try {
    const result = await groupsApi.list(q, page);
    if (!result.items.length) grid.append(el('div', { className: 'platform-state', text: 'ยังไม่มีกลุ่มที่ตรงกับการค้นหา' }));
    for (const group of result.items) {
      grid.append(el('a', { className: 'platform-card group-card', attrs: { href: `/groups/${group.id}` } },
        el('div', { className: 'group-card__cover' }),
        el('h2', { text: group.name }),
        el('p', { text: group.description || 'ชุมชนสำหรับแลกเปลี่ยนและพูดคุย' }),
        el('div', { className: 'platform-meta', text: `${group.memberCount} สมาชิก${group.university ? ` · ${group.university}` : ''}` }),
      ));
    }
    const nav = pager(result.page, result.pages, q);
    if (nav) root.append(nav);
  } catch (error) {
    grid.append(el('div', { className: 'platform-state platform-state--error', text: errorMessage(error) }));
  }
  return { title: 'กลุ่ม', element: root };
}

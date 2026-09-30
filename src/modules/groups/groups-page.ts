import { authStore } from '../../core/auth/auth-store';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { reactIcon } from '../../core/ui/react-icon';
import { errorMessage } from '../../core/ui/error-message';
import { createEmptyState, createErrorState } from '../../core/ui/feedback';
import { toast } from '../../core/ui/toast';
import { createUniversityBadge } from '../../core/ui/avatar';
import { profileImageUrl } from '../profile/profile-api';
import { groupsApi, type CommunityGroup } from './groups-api';

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

export function renderGroupCard(group: CommunityGroup): HTMLElement {
  const card = el('a', {
    className: 'platform-card group-card',
    attrs: { href: `/groups/${encodeURIComponent(group.id)}` },
  });

  const coverWrap = el('div', { className: 'group-card__cover' });
  if (group.coverUrl) {
    const img = el('img', {
      className: 'group-card__cover-img',
      attrs: {
        src: profileImageUrl(group.coverUrl),
        alt: group.name,
        loading: 'lazy',
      },
    });
    img.addEventListener('error', () => {
      coverWrap.replaceChildren(el('div', { className: 'group-card__cover-fallback' }, reactIcon('users')));
    });
    coverWrap.append(img);
  } else {
    const code = (group.university || '').toUpperCase();
    let grad = 'linear-gradient(135deg, #e8dfd8 0%, #d5c8be 100%)';
    if (code.includes('KMITL')) grad = 'linear-gradient(135deg, rgba(232, 85, 42, 0.25) 0%, rgba(232, 85, 42, 0.5) 100%)';
    else if (code.includes('KMUTT')) grad = 'linear-gradient(135deg, rgba(239, 108, 0, 0.25) 0%, rgba(245, 124, 0, 0.5) 100%)';
    else if (code.includes('KMUTNB')) grad = 'linear-gradient(135deg, rgba(216, 67, 21, 0.25) 0%, rgba(191, 54, 12, 0.5) 100%)';
    coverWrap.style.background = grad;
    coverWrap.append(el('div', { className: 'group-card__cover-fallback' }, reactIcon('users')));
  }

  const badges = el('div', { className: 'group-card__badges' });
  if (group.university) {
    badges.append(createUniversityBadge(group.university));
  }
  const privacyBadge = el('span', {
    className: 'badge-tag',
  });
  privacyBadge.append(
    reactIcon(group.privacy === 'private' ? 'lock' : 'globe'),
    document.createTextNode(group.privacy === 'private' ? ' ส่วนตัว' : ' สาธารณะ'),
  );
  badges.append(privacyBadge);
  coverWrap.append(badges);

  const body = el('div', { className: 'group-card__body' });
  const title = el('h2', { text: group.name });
  const desc = el('p', { text: group.description || 'ชุมชนสำหรับแลกเปลี่ยนและพูดคุย' });
  body.append(title, desc);

  const footer = el('div', { className: 'group-card__footer' });
  const meta = el('span', {
    className: 'platform-meta',
    text: `${group.memberCount} สมาชิก`,
  });

  const cta = el('span', {
    className: `button button--small ${group.joined ? 'button--secondary' : 'button--primary'}`,
    text: group.joined ? 'เข้าร่วมแล้ว ✓' : 'เข้าชมกลุ่ม',
  });
  footer.append(meta, cta);

  card.append(coverWrap, body, footer);
  return card;
}

export async function groupsPage(context: RouteContext): Promise<PageView> {
  const q = context.query.get('q')?.trim() ?? '';
  const page = validPage(context.query.get('page'));
  const root = el('section', { className: 'platform-page groups-page' });
  let createDialog: HTMLDialogElement | null = null;
  const header = el('div', { className: 'platform-heading-row page-header' });
  header.append(
    el('div', {}, el('p', { className: 'eyebrow', text: 'ชุมชน' }), el('h1', { className: 'platform-title', text: 'กลุ่ม' })),
  );

  if (authStore.snapshot.status === 'authenticated') {
    const createButton = el('button', { className: 'button button--primary', attrs: { type: 'button' } });
    createButton.append(reactIcon('plus'), document.createTextNode(' สร้างกลุ่ม'));
    createDialog = createGroupDialog();
    createButton.addEventListener('click', () => createDialog?.showModal());
    header.append(createButton);
    root.append(createDialog);
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
    if (!result.items.length) {
      const empty = createEmptyState({
        icon: '<span aria-hidden="true">◌</span>',
        title: q ? 'ไม่พบกลุ่มที่ตรงกับการค้นหา' : 'ยังไม่มีกลุ่มให้สำรวจ',
        description: q
          ? `ไม่พบกลุ่มที่ตรงกับ “${q}” ลองล้างคำค้นหาหรือใช้คำที่กว้างขึ้น`
          : 'สร้างพื้นที่พูดคุยสำหรับวิชา ชมรม โปรเจกต์ หรือความสนใจของคุณ',
        actionText: q ? 'ล้างการค้นหา' : authStore.snapshot.status === 'authenticated' ? 'สร้างกลุ่มแรก' : 'เข้าสู่ระบบเพื่อสร้างกลุ่ม',
        actionHref: q ? '/groups' : authStore.snapshot.status === 'authenticated' ? undefined : '/login?returnTo=%2Fgroups',
        onAction: !q && authStore.snapshot.status === 'authenticated' ? () => createDialog?.showModal() : undefined,
      });
      empty.classList.add('groups-empty-state');
      grid.append(empty);
    }
    for (const group of result.items) {
      grid.append(renderGroupCard(group));
    }
    const nav = pager(result.page, result.pages, q);
    if (nav) root.append(nav);
  } catch (error) {
    const failure = createErrorState({
      title: 'โหลดกลุ่มไม่สำเร็จ',
      message: errorMessage(error),
      onRetry: () => window.location.reload(),
    });
    failure.classList.add('groups-empty-state');
    grid.append(failure);
  }
  return { title: 'กลุ่ม', element: root };
}

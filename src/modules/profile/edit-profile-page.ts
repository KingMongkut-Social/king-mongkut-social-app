import { authStore } from '../../core/auth/auth-store';
import { navigateTo } from '../../core/auth/auth-navigation';
import type { PageView } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import type { User } from '../../types/api';
import { profileApi, profileImageUrl, type EditProfileInput } from './profile-api';

import { createAcademicCombobox } from './academic-combobox';
import { searchDepartments, searchFaculties } from './academic-data';

type ImageKind = 'avatar' | 'cover';
const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);

interface ImageControl {
  element: HTMLElement;
  input: HTMLInputElement;
  file(): File | null;
  removed(): boolean;
  saved(url: string | null): void;
  dispose(): void;
}

function row(label: string, id: string, control: HTMLElement): HTMLElement {
  const wrapper = el('div', { className: 'edit-profile-row' });
  const field = el('div', { className: 'edit-profile-control' });
  field.append(control, el('p', { className: 'edit-profile-field-error', attrs: { id: `${id}-error`, 'aria-live': 'polite' } }));
  wrapper.append(el('label', { text: label, attrs: { for: id } }), field);
  return wrapper;
}

function textInput(id: string, value: string, maxLength: number): HTMLInputElement {
  const input = el('input', { className: 'edit-profile-input', attrs: {
    id, name: id, type: 'text', maxlength: String(maxLength), 'aria-describedby': `${id}-error`,
  } });
  input.value = value;
  return input;
}

function imageControl(kind: ImageKind, initialUrl: string | null | undefined, setError: (id: string, message: string) => void): ImageControl {
  const id = `edit-profile-${kind}`;
  const element = el('div', { className: 'edit-profile-image-control' });
  const preview = el('span', { className: `edit-profile-image-preview edit-profile-image-preview--${kind}` });
  const image = el('img', { attrs: { alt: kind === 'avatar' ? 'ตัวอย่างรูปโปรไฟล์' : 'ตัวอย่างรูปหน้าปก' } });
  preview.append(image);
  const choose = el('button', { className: 'button button--secondary button--small edit-profile-image-button', text: 'เปลี่ยนรูป', attrs: { type: 'button' } });
  const remove = el('button', { className: 'button button--danger button--small edit-profile-image-remove', text: 'ลบรูป', attrs: { type: 'button', 'aria-label': kind === 'avatar' ? 'ลบรูปโปรไฟล์' : 'ลบรูปหน้าปก' } });
  const filename = el('span', { className: 'edit-profile-image-filename', attrs: { 'aria-live': 'polite' } });
  const input = el('input', { className: 'edit-profile-file-input', attrs: {
    id, name: id, type: 'file', accept: 'image/jpeg,image/png,image/gif,image/webp,image/avif',
    'aria-describedby': `${id}-error`, 'aria-label': kind === 'avatar' ? 'เลือกรูปโปรไฟล์' : 'เลือกรูปหน้าปก',
  } });
  let currentUrl = initialUrl || null;
  let selected: File | null = null;
  let removed = false;
  let objectUrl: string | null = null;

  const revoke = (): void => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  };
  const render = (): void => {
    const url = objectUrl || (removed ? null : currentUrl && profileImageUrl(currentUrl));
    preview.hidden = !url;
    image.hidden = !url;
    if (url) image.src = url;
    else image.removeAttribute('src');
    filename.textContent = selected?.name || '';
    remove.hidden = !url;
  };
  choose.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const maxSize = kind === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (!acceptedImageTypes.has(file.type)) {
      setError(id, 'รองรับรูป JPEG, PNG, GIF, WebP หรือ AVIF เท่านั้น');
      input.value = '';
      return;
    }
    if (file.size > maxSize) {
      setError(id, `รูปต้องมีขนาดไม่เกิน ${kind === 'avatar' ? 5 : 10} MB`);
      input.value = '';
      return;
    }
    setError(id, '');
    revoke();
    selected = file;
    removed = false;
    objectUrl = URL.createObjectURL(file);
    render();
  });
  remove.addEventListener('click', () => {
    revoke();
    selected = null;
    removed = true;
    input.value = '';
    setError(id, '');
    render();
  });
  element.append(preview, choose, remove, filename, input);
  render();
  return {
    element, input,
    file: () => selected,
    removed: () => removed,
    saved: (url) => {
      revoke();
      currentUrl = url;
      selected = null;
      removed = false;
      input.value = '';
      render();
    },
    dispose: revoke,
  };
}

function syncUser(user: User): void {
  const token = authStore.snapshot.accessToken;
  if (token) authStore.setAuthenticated(user, token);
}

export async function editProfilePage(): Promise<PageView> {
  if (authStore.snapshot.status !== 'authenticated') {
    return { title: 'แก้ไขโปรไฟล์', element: el('div'), redirectTo: '/login?returnTo=%2Fprofile%2Fedit' };
  }
  const user = await profileApi.getMine();
  syncUser(user);

  const root = el('section', { className: 'edit-profile-page' });
  root.append(el('h1', { className: 'edit-profile-page-title', text: 'แก้ไขโปรไฟล์' }));
  const card = el('div', { className: 'edit-profile-card' });
  card.append(el('h2', { className: 'edit-profile-card-title', text: 'แก้ไขโปรไฟล์' }));
  const form = el('form', { className: 'edit-profile-form', attrs: { novalidate: 'true' } });

  const controls = new Map<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>();
  const setError = (id: string, message: string): void => {
    const target = form.querySelector<HTMLElement>(`#${id}-error`);
    if (target) target.textContent = message;
    const control = controls.get(id);
    if (control) {
      if (message) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    }
  };
  const avatar = imageControl('avatar', user.avatarUrl, setError);
  const cover = imageControl('cover', user.coverUrl, setError);
  controls.set('edit-profile-avatar', avatar.input);
  controls.set('edit-profile-cover', cover.input);

  const name = textInput('edit-profile-name', user.name, 80);
  const username = textInput('edit-profile-username', user.username || '', 30);
  username.autocapitalize = 'none';
  username.spellcheck = false;
  const bio = el('textarea', { className: 'edit-profile-input edit-profile-bio', attrs: {
    id: 'edit-profile-bio', name: 'edit-profile-bio', maxlength: '500', rows: '1', 'aria-describedby': 'edit-profile-bio-error',
  } });
  bio.value = user.bio || '';
  const university = textInput('edit-profile-university', user.university, 20);
  university.readOnly = true;
  university.title = 'มหาวิทยาลัยยืนยันจากอีเมลบัญชีของคุณ';
  const facultyCombobox = createAcademicCombobox({
    id: 'edit-profile-faculty',
    name: 'edit-profile-faculty',
    placeholder: 'พิมพ์ค้นหา หรือเลือกคณะ... (สามารถระบุเองได้)',
    initialValue: user.faculty || '',
    inputClassName: 'edit-profile-input academic-combobox__input',
    getSuggestions: (q) => searchFaculties(q, user.university),
    onSelect: () => {
      departmentCombobox.refresh();
      if (!departmentCombobox.getValue().trim()) {
        departmentCombobox.open();
      }
    },
  });

  const departmentCombobox = createAcademicCombobox({
    id: 'edit-profile-department',
    name: 'edit-profile-department',
    placeholder: 'พิมพ์ค้นหา หรือเลือกภาควิชา... (สามารถระบุเองได้)',
    initialValue: user.department || '',
    inputClassName: 'edit-profile-input academic-combobox__input',
    getSuggestions: (q) => searchDepartments(q, facultyCombobox.getValue(), user.university),
  });

  const faculty = facultyCombobox.input;
  const department = departmentCombobox.input;
  const year = el('select', { className: 'edit-profile-input', attrs: {
    id: 'edit-profile-year', name: 'edit-profile-year', 'aria-describedby': 'edit-profile-year-error',
  } });
  year.append(el('option', { text: 'ยังไม่ระบุ', attrs: { value: '' } }));
  for (let n = 1; n <= 8; n++) year.append(el('option', { text: `ปี ${n}`, attrs: { value: String(n) } }));
  year.value = user.academicYear == null ? '' : String(user.academicYear);
  for (const control of [name, username, bio, university, faculty, department, year]) controls.set(control.id, control);

  form.append(
    row('รูปโปรไฟล์', 'edit-profile-avatar', avatar.element),
    row('รูปหน้าปก', 'edit-profile-cover', cover.element),
    row('ชื่อที่แสดง', name.id, name),
    row('Username', username.id, username),
    row('Bio', bio.id, bio),
    row('มหาวิทยาลัย', university.id, university),
    row('คณะ', faculty.id, facultyCombobox.container),
    row('ภาควิชา', department.id, departmentCombobox.container),
    row('ชั้นปี', year.id, year),
  );
  const formError = el('p', { className: 'edit-profile-form-error', attrs: { role: 'alert' } });
  const actions = el('div', { className: 'edit-profile-actions' });
  const cancel = el('button', { className: 'button button--secondary edit-profile-cancel', text: 'ยกเลิก', attrs: { type: 'button' } });
  const save = el('button', { className: 'button button--primary edit-profile-save', text: 'บันทึก', attrs: { type: 'submit' } });
  cancel.addEventListener('click', () => navigateTo('/profile'));
  actions.append(cancel, save);
  form.append(formError, actions);
  card.append(form);
  root.append(card);

  const validate = (): EditProfileInput | null => {
    formError.textContent = '';
    for (const id of ['edit-profile-name', 'edit-profile-username', 'edit-profile-bio', 'edit-profile-faculty', 'edit-profile-department', 'edit-profile-year']) setError(id, '');
    const data: EditProfileInput = {
      name: name.value.trim(),
      username: username.value.trim().toLowerCase() || null,
      bio: bio.value.trim(),
      faculty: faculty.value.trim(),
      department: department.value.trim(),
      academicYear: year.value ? Number(year.value) : null,
    };
    if (data.name.length < 2 || data.name.length > 80) setError(name.id, 'ชื่อที่แสดงต้องมี 2–80 ตัวอักษร');
    if (data.username && !/^[a-z0-9_][a-z0-9._]{1,28}[a-z0-9_]$/.test(data.username)) {
      setError(username.id, 'Username ต้องมี 3–30 ตัว ใช้ a–z, 0–9, _ หรือ . และไม่ขึ้นต้นหรือลงท้ายด้วยจุด');
    }
    if (data.bio.length > 500) setError(bio.id, 'Bio ต้องไม่เกิน 500 ตัวอักษร');
    if (data.faculty.length < 1 || data.faculty.length > 150) setError(faculty.id, 'กรุณากรอกคณะไม่เกิน 150 ตัวอักษร');
    if (data.department.length < 1 || data.department.length > 150) setError(department.id, 'กรุณากรอกภาควิชาไม่เกิน 150 ตัวอักษร');
    if (data.academicYear !== null && (!Number.isInteger(data.academicYear) || data.academicYear < 1 || data.academicYear > 8)) {
      setError(year.id, 'เลือกชั้นปี 1–8');
    }
    const firstInvalid = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[aria-invalid="true"]');
    if (firstInvalid) {
      formError.textContent = 'กรุณาตรวจสอบข้อมูลที่กรอก';
      firstInvalid.focus();
      return null;
    }
    return data;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (save.disabled) return;
    const data = validate();
    if (!data) return;
    save.disabled = true;
    cancel.disabled = true;
    save.textContent = 'กำลังบันทึก…';
    let detailsSaved = false;
    try {
      const updated = await profileApi.updateMine(data);
      syncUser(updated);
      detailsSaved = true;
      for (const [kind, imageState] of [['avatar', avatar], ['cover', cover]] as const) {
        const file = imageState.file();
        if (file) {
          const uploaded = await profileApi.uploadMineImage(kind, file);
          syncUser(uploaded.user);
          imageState.saved(uploaded.asset.url);
        } else if (imageState.removed()) {
          const cleared = await profileApi.removeMineImage(kind);
          syncUser(cleared);
          imageState.saved(null);
        }
      }
      toast.success('บันทึกโปรไฟล์แล้ว');
      navigateTo('/profile');
    } catch (cause) {
      formError.textContent = `${detailsSaved ? 'บันทึกข้อมูลทั่วไปแล้ว แต่ไม่สามารถอัปเดตรูปได้: ' : ''}${errorMessage(cause)}`;
      save.disabled = false;
      cancel.disabled = false;
      save.textContent = 'บันทึก';
    }
  });

  return { title: 'แก้ไขโปรไฟล์', element: root, dispose: () => { avatar.dispose(); cover.dispose(); } };
}

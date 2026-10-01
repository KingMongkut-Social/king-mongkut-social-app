import { authApi } from '../../core/auth/auth-api';
import { authStore } from '../../core/auth/auth-store';
import { navigateTo } from '../../core/auth/auth-navigation';
import { safeReturnTo } from '../../core/auth/return-to';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import type { User } from '../../types/api';
import { profileSchema } from '../../validation/schemas';
import { createAcademicCombobox } from '../profile/academic-combobox';
import { searchDepartments, searchFaculties } from '../profile/academic-data';
import { profileApi, profileImageUrl } from '../profile/profile-api';
import { clearFieldErrors, field, showZodErrors } from '../shared/form';

type OnboardingImageKind = 'avatar' | 'cover';

interface RequiredImageControl {
  element: HTMLElement;
  input: HTMLInputElement;
  hasImage(): boolean;
  upload(): Promise<void>;
  dispose(): void;
}

const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);

function syncUser(user: User): void {
  const token = authStore.snapshot.accessToken;
  if (token) authStore.setAuthenticated(user, token);
}

function requiredImageControl(
  kind: OnboardingImageKind,
  initialUrl: string | null | undefined,
  setError: (message: string) => void,
): RequiredImageControl {
  const isAvatar = kind === 'avatar';
  const root = el('div', { className: `onboarding-image onboarding-image--${kind}` });
  const preview = el('div', { className: `onboarding-image__preview onboarding-image__preview--${kind}` });
  const image = el('img', {
    attrs: {
      alt: isAvatar ? 'ตัวอย่างรูปโปรไฟล์' : 'ตัวอย่างรูปหน้าปก',
    },
  });
  const placeholder = el('span', {
    className: 'onboarding-image__placeholder',
    text: isAvatar ? 'เพิ่มรูปโปรไฟล์' : 'เพิ่มรูปหน้าปก',
  });
  preview.append(image, placeholder);

  const choose = el('button', {
    className: 'button button--secondary onboarding-image__choose',
    text: isAvatar ? 'เลือกรูปโปรไฟล์' : 'เลือกรูปหน้าปก',
    attrs: { type: 'button' },
  });
  const filename = el('span', { className: 'onboarding-image__filename', attrs: { 'aria-live': 'polite' } });
  const input = el('input', {
    className: 'onboarding-image__input',
    attrs: {
      type: 'file',
      name: kind,
      accept: 'image/jpeg,image/png,image/gif,image/webp,image/avif',
      'aria-label': isAvatar ? 'เลือกรูปโปรไฟล์' : 'เลือกรูปหน้าปก',
    },
  });

  let currentUrl = initialUrl ?? null;
  let selected: File | null = null;
  let objectUrl: string | null = null;

  const revoke = (): void => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  };

  const render = (): void => {
    const url = objectUrl || (currentUrl ? profileImageUrl(currentUrl) : '');
    image.hidden = !url;
    placeholder.hidden = Boolean(url);
    if (url) image.src = url;
    else image.removeAttribute('src');
    filename.textContent = selected?.name ?? (currentUrl ? 'มีรูปแล้ว' : 'จำเป็นต้องเพิ่มรูป');
    root.classList.toggle('onboarding-image--complete', Boolean(url));
  };

  choose.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const maxSize = isAvatar ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (!acceptedImageTypes.has(file.type)) {
      setError('รองรับเฉพาะ JPEG, PNG, GIF, WebP หรือ AVIF');
      input.value = '';
      return;
    }
    if (file.size > maxSize) {
      setError(`รูปต้องมีขนาดไม่เกิน ${isAvatar ? 5 : 10} MB`);
      input.value = '';
      return;
    }
    setError('');
    revoke();
    selected = file;
    objectUrl = URL.createObjectURL(file);
    render();
  });

  root.append(preview, choose, filename, input);
  render();

  return {
    element: root,
    input,
    hasImage: () => Boolean(currentUrl || selected),
    async upload() {
      if (!selected) return;
      const result = await profileApi.uploadMineImage(kind, selected);
      syncUser(result.user);
      revoke();
      currentUrl = result.asset.url;
      selected = null;
      input.value = '';
      render();
    },
    dispose: revoke,
  };
}

export function completeProfilePage(context: RouteContext): PageView {
  const user = authStore.snapshot.user;
  const returnTo = safeReturnTo(context.query.get('returnTo'));
  if (user && !user.needsProfileCompletion) {
    return { title: 'โปรไฟล์', element: el('div'), redirectTo: returnTo };
  }

  const page = el('div', { className: 'profile-onboarding-shell' });
  const card = el('section', { className: 'profile-onboarding-card' });
  const header = el('div', { className: 'profile-onboarding-header' },
    el('span', { className: 'onboarding-step-indicator', text: 'ตั้งค่าโปรไฟล์ครั้งแรก' }),
    el('h1', { className: 'auth-card-title', text: 'กรอกข้อมูลให้ครบก่อนเริ่มใช้งาน' }),
    el('p', {
      className: 'auth-card-subtitle',
      text: 'ข้อมูลทุกช่องด้านล่างจำเป็นสำหรับการสร้างโปรไฟล์ครั้งแรก คุณจะแก้ไขภายหลังได้จากหน้าโปรไฟล์',
    }),
    el('p', {
      className: 'auth-profile-identity',
      text: `${user?.email ?? ''} · ${user?.university ?? ''}`,
    }),
  );

  const form = el('form', { className: 'auth-profile-form profile-onboarding-form', attrs: { novalidate: 'true' } });
  const formError = el('p', { className: 'form-error profile-onboarding-error', attrs: { role: 'alert' } });

  const setImageError = (name: OnboardingImageKind, message: string): void => {
    const target = form.querySelector<HTMLElement>(`#${name}-error`);
    if (target) target.textContent = message;
  };

  const avatar = requiredImageControl('avatar', user?.avatarUrl, (message) => setImageError('avatar', message));
  const cover = requiredImageControl('cover', user?.coverUrl, (message) => setImageError('cover', message));

  const name = el('input', {
    className: 'input',
    attrs: {
      id: 'name',
      name: 'name',
      type: 'text',
      maxlength: '80',
      autocomplete: 'name',
      placeholder: 'ชื่อที่ต้องการแสดง',
      value: user?.name ?? '',
    },
  });

  const username = el('input', {
    className: 'input',
    attrs: {
      id: 'username',
      name: 'username',
      type: 'text',
      maxlength: '30',
      autocomplete: 'username',
      autocapitalize: 'none',
      spellcheck: 'false',
      placeholder: 'เช่น somchai.kmitl',
      value: user?.username ?? '',
    },
  });

  const bio = el('textarea', {
    className: 'input profile-onboarding-bio',
    attrs: {
      id: 'bio',
      name: 'bio',
      maxlength: '500',
      rows: '4',
      placeholder: 'แนะนำตัวสั้น ๆ',
    },
  });
  bio.value = user?.bio ?? '';

  const university = el('input', {
    className: 'input locked-university-input',
    attrs: {
      id: 'university',
      type: 'text',
      readonly: 'true',
      value: user?.university ?? '',
      'aria-label': 'มหาวิทยาลัย',
    },
  });

  const facultyCombobox = createAcademicCombobox({
    id: 'faculty',
    name: 'faculty',
    placeholder: 'พิมพ์ค้นหา หรือเลือกคณะ...',
    initialValue: user?.faculty ?? '',
    getSuggestions: (q) => searchFaculties(q, user?.university),
    onSelect: () => {
      departmentCombobox.refresh();
      if (!departmentCombobox.getValue().trim()) departmentCombobox.open();
    },
  });

  const departmentCombobox = createAcademicCombobox({
    id: 'department',
    name: 'department',
    placeholder: 'พิมพ์ค้นหา หรือเลือกภาควิชา / สาขาวิชา...',
    initialValue: user?.department ?? '',
    getSuggestions: (q) => searchDepartments(q, facultyCombobox.getValue(), user?.university),
  });

  const academicYear = el('select', {
    className: 'input',
    attrs: {
      id: 'academicYear',
      name: 'academicYear',
      'aria-label': 'ชั้นปี',
    },
  });
  academicYear.append(el('option', { text: 'เลือกชั้นปี', attrs: { value: '' } }));
  for (let year = 1; year <= 8; year++) {
    academicYear.append(el('option', { text: `ปี ${year}`, attrs: { value: String(year) } }));
  }
  academicYear.value = user?.academicYear == null ? '' : String(user.academicYear);

  const imageFields = el('div', { className: 'profile-onboarding-images' },
    field('avatar', 'รูปโปรไฟล์ *', avatar.element, 'จำเป็น · JPEG/PNG/GIF/WebP/AVIF ไม่เกิน 5 MB'),
    field('cover', 'รูปหน้าปก *', cover.element, 'จำเป็น · JPEG/PNG/GIF/WebP/AVIF ไม่เกิน 10 MB'),
  );

  form.append(
    imageFields,
    field('name', 'ชื่อที่แสดง *', name),
    field('username', 'Username *', username, '3–30 ตัว ใช้ a–z, 0–9, _ หรือ .'),
    field('bio', 'Bio *', bio, 'แนะนำตัวอย่างน้อย 1 ตัวอักษร'),
    field('university', 'มหาวิทยาลัย', university, 'กำหนดอัตโนมัติจากอีเมลมหาวิทยาลัยและแก้ไขไม่ได้'),
    field('faculty', 'คณะ *', facultyCombobox.container),
    field('department', 'ภาควิชา / สาขาวิชา *', departmentCombobox.container),
    field('academicYear', 'ชั้นปี *', academicYear),
    formError,
  );

  const submit = el('button', {
    className: 'button button--primary button--full profile-onboarding-submit',
    text: 'บันทึกและเริ่มใช้งาน',
    attrs: { type: 'submit' },
  });
  form.append(submit);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;

    clearFieldErrors(form);
    formError.textContent = '';
    setImageError('avatar', '');
    setImageError('cover', '');

    let imageInvalid = false;
    if (!avatar.hasImage()) {
      setImageError('avatar', 'กรุณาเลือกรูปโปรไฟล์');
      imageInvalid = true;
    }
    if (!cover.hasImage()) {
      setImageError('cover', 'กรุณาเลือกรูปหน้าปก');
      imageInvalid = true;
    }

    const result = profileSchema.safeParse({
      name: name.value,
      username: username.value,
      bio: bio.value,
      faculty: facultyCombobox.getValue(),
      department: departmentCombobox.getValue(),
      academicYear: academicYear.value ? Number(academicYear.value) : 0,
    });

    if (!result.success) showZodErrors(form, result.error);
    if (!result.success || imageInvalid) {
      formError.textContent = 'กรุณากรอกข้อมูลที่จำเป็นให้ครบทุกช่อง';
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = 'กำลังบันทึกโปรไฟล์…';

    try {
      await avatar.upload();
      await cover.upload();
      await authApi.updateProfile(result.data);
      navigateTo(returnTo, true);
    } catch (cause) {
      formError.textContent = errorMessage(cause);
      submit.disabled = false;
      submit.textContent = 'บันทึกและเริ่มใช้งาน';
    }
  });

  const logout = el('button', {
    className: 'button button--ghost profile-onboarding-logout',
    text: 'ออกจากระบบ / เปลี่ยนบัญชี',
    attrs: { type: 'button' },
  });
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try {
      await authApi.logout();
    } catch {
      // Local state is cleared even if the network fails.
    }
    navigateTo('/login?returnTo=' + encodeURIComponent(returnTo), true);
  });

  card.append(header, form, logout);
  page.append(card);

  return {
    title: 'ตั้งค่าโปรไฟล์ครั้งแรก',
    element: page,
    dispose: () => {
      avatar.dispose();
      cover.dispose();
    },
  };
}

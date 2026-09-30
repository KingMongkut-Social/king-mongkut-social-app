import { authApi } from '../../core/auth/auth-api';
import { authStore } from '../../core/auth/auth-store';
import { navigateTo } from '../../core/auth/auth-navigation';
import { safeReturnTo } from '../../core/auth/return-to';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { profileSchema } from '../../validation/schemas';
import { clearFieldErrors, field, showZodErrors } from '../shared/form';
import { createAcademicCombobox } from '../profile/academic-combobox';
import { searchDepartments, searchFaculties } from '../profile/academic-data';

export function completeProfilePage(context: RouteContext): PageView {
  const user = authStore.snapshot.user;
  const returnTo = safeReturnTo(context.query.get('returnTo'));
  if (user && !user.needsProfileCompletion) {
    return { title: 'โปรไฟล์', element: el('div'), redirectTo: returnTo };
  }
  const page = el('div', { className: 'auth-landing-page' });
  const card = el('section', { className: 'auth-sso-card' },
    el('h1', { className: 'auth-card-title', text: 'เติมข้อมูลโปรไฟล์ของคุณ' }),
    el('p', { className: 'auth-card-subtitle', text: 'กรอกหรือค้นหาเลือกคณะและภาควิชาก่อนเริ่มใช้งาน หากไม่มีในรายการสามารถพิมพ์เพิ่มเองได้' }),
    el('p', { className: 'auth-profile-identity', text: (user?.email ?? '') + ' · ' + (user?.university ?? '') }),
  );
  const form = el('form', { className: 'auth-profile-form', attrs: { novalidate: 'true' } });

  const facultyCombobox = createAcademicCombobox({
    id: 'faculty',
    name: 'faculty',
    placeholder: 'พิมพ์ค้นหา หรือเลือกคณะ... (สามารถระบุเองได้)',
    initialValue: user?.faculty ?? '',
    getSuggestions: (q) => searchFaculties(q, user?.university),
    onSelect: () => {
      departmentCombobox.refresh();
      if (!departmentCombobox.getValue().trim()) {
        departmentCombobox.open();
      }
    },
  });

  const departmentCombobox = createAcademicCombobox({
    id: 'department',
    name: 'department',
    placeholder: 'พิมพ์ค้นหา หรือเลือกภาควิชา... (สามารถระบุเองได้)',
    initialValue: user?.department ?? '',
    getSuggestions: (q) => searchDepartments(q, facultyCombobox.getValue(), user?.university),
  });

  const faculty = facultyCombobox.input;
  const department = departmentCombobox.input;

  const error = el('p', { className: 'form-error', attrs: { role: 'alert' } });
  const submit = el('button', { className: 'button button--primary button--full', text: 'บันทึกและเข้าใช้งาน', attrs: { type: 'submit' } });
  form.append(
    field('faculty', 'คณะ', facultyCombobox.container, 'พิมพ์ค้นหาหรือเลือกจากรายการทั้งหมด หากไม่มีสามารถพิมพ์ระบุเองได้'),
    field('department', 'ภาควิชา / สาขาวิชา', departmentCombobox.container, 'พิมพ์ค้นหาหรือเลือกจากรายการทั้งหมด หากไม่มีสามารถพิมพ์ระบุเองได้'),
    error,
    submit,
  );
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    clearFieldErrors(form);
    error.textContent = '';
    const result = profileSchema.safeParse({ faculty: faculty.value, department: department.value });
    if (!result.success) { showZodErrors(form, result.error); return; }
    submit.disabled = true;
    submit.textContent = 'กำลังบันทึก…';
    try {
      await authApi.updateProfile(result.data);
      navigateTo(returnTo, true);
    } catch (cause) {
      error.textContent = errorMessage(cause);
      submit.disabled = false;
      submit.textContent = 'บันทึกและเข้าใช้งาน';
    }
  });
  const logout = el('button', { className: 'button button--ghost', text: 'ออกจากระบบ / เปลี่ยนบัญชี', attrs: { type: 'button' } });
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try { await authApi.logout(); } catch { /* Local state is cleared even if the network fails. */ }
    navigateTo('/login?returnTo=' + encodeURIComponent(returnTo), true);
  });
  card.append(form, logout);
  page.append(card);
  return { title: 'กรอกข้อมูลโปรไฟล์', element: page };
}

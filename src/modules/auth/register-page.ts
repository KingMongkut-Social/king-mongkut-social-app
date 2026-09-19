import { authApi } from '../../core/auth/auth-api';
import type { PageView } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { registerSchema } from '../../validation/schemas';
import { clearFieldErrors, field, showZodErrors } from '../shared/form';

export function registerPage(): PageView {
  const section = el('section', { className: 'auth-page page-shell' });
  const panel = el('div', { className: 'auth-card' });
  const heading = el('div', { className: 'auth-card__heading' },
    el('p', { className: 'eyebrow', text: 'Get started' }),
    el('h1', { text: 'Create your account' }),
    el('p', { className: 'muted', text: 'Write drafts privately, publish when ready, and manage your own posts.' }),
  );

  const form = el('form', { className: 'form', attrs: { novalidate: 'true' } });
  const name = el('input', {
    className: 'input',
    attrs: { id: 'name', name: 'name', type: 'text', autocomplete: 'name', maxlength: '80', required: 'true' },
  });
  const email = el('input', {
    className: 'input',
    attrs: { id: 'email', name: 'email', type: 'email', autocomplete: 'email', required: 'true' },
  });

  // สร้าง Dropdown ให้เลือกมหาวิทยาลัย
  const university = el('select', {
    className: 'input',
    attrs: { id: 'university', name: 'university', required: 'true' },
  },
    el('option', { attrs: { value: '' }, text: '-- Select University --' }),
    el('option', { attrs: { value: 'KMITL' }, text: 'KMITL' }),
    el('option', { attrs: { value: 'KMUTNB' }, text: 'KMUTNB' }),
    el('option', { attrs: { value: 'KMUTT' }, text: 'KMUTT' }),
  );

  const password = el('input', {
    className: 'input',
    attrs: { id: 'password', name: 'password', type: 'password', autocomplete: 'new-password', maxlength: '128', required: 'true' },
  });
  const submit = el('button', { className: 'button button--primary button--full', text: 'Create account', attrs: { type: 'submit' } });
  const formError = el('p', { className: 'form-error', attrs: { role: 'alert' } });

  form.append(
    field('name', 'Name', name),
    field('email', 'Email', email),
    field('university', 'University', university), // แทรกฟิลด์ university ในฟอร์ม
    field('password', 'Password', password, '10+ characters with uppercase, lowercase, and a number.'),
    formError,
    submit,
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    formError.textContent = '';

    const result = registerSchema.safeParse({
      name: name.value,
      email: email.value.trim(),
      password: password.value,
      university: university.value,
    });
    if (!result.success) {
      showZodErrors(form, result.error);
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Creating account…';
    try {
      await authApi.register(result.data);
      toast.success('Account created');
      window.history.pushState(null, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      formError.textContent = errorMessage(error);
      submit.disabled = false;
      submit.textContent = 'Create account';
    }
  });

  panel.append(
    heading,
    form,
    el('p', { className: 'auth-card__footer' },
      document.createTextNode('Already have an account? '),
      el('a', { className: 'text-link', text: 'Sign in', attrs: { href: '/login' } }),
    ),
  );
  section.append(panel);
  return { title: 'Register', element: section };
}
import { authApi } from '../../core/auth/auth-api';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { loginSchema } from '../../validation/schemas';
import { clearFieldErrors, field, showZodErrors } from '../shared/form';

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export function loginPage(context: RouteContext): PageView {
  const section = el('section', { className: 'auth-page page-shell' });
  const panel = el('div', { className: 'auth-card' });
  const heading = el('div', { className: 'auth-card__heading' },
    el('p', { className: 'eyebrow', text: 'Welcome back' }),
    el('h1', { text: 'Sign in to your account' }),
    el('p', { className: 'muted', text: 'Your access token stays in memory. The refresh token remains in an HttpOnly cookie.' }),
  );

  const form = el('form', { className: 'form', attrs: { novalidate: 'true' } });
  const email = el('input', {
    className: 'input',
    attrs: { id: 'email', name: 'email', type: 'email', autocomplete: 'email', required: 'true' },
  });
  const password = el('input', {
    className: 'input',
    attrs: { id: 'password', name: 'password', type: 'password', autocomplete: 'current-password', required: 'true' },
  });
  const submit = el('button', { className: 'button button--primary button--full', text: 'Sign in', attrs: { type: 'submit' } });
  const formError = el('p', { className: 'form-error', attrs: { role: 'alert' } });
  form.append(field('email', 'Email', email), field('password', 'Password', password), formError, submit);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    formError.textContent = '';

    const result = loginSchema.safeParse({ email: email.value.trim(), password: password.value });
    if (!result.success) {
      showZodErrors(form, result.error);
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Signing in…';
    try {
      await authApi.login(result.data);
      toast.success('Signed in successfully');
      const returnTo = safeReturnTo(context.query.get('returnTo'));
      window.history.pushState(null, '', returnTo);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      formError.textContent = errorMessage(error);
      submit.disabled = false;
      submit.textContent = 'Sign in';
    }
  });

  panel.append(
    heading,
    form,
    el('p', { className: 'auth-card__footer' },
      document.createTextNode('New here? '),
      el('a', { className: 'text-link', text: 'Create an account', attrs: { href: '/register' } }),
    ),
  );
  section.append(panel);
  return { title: 'Login', element: section };
}

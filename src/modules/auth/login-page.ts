import { authApi } from '../../core/auth/auth-api';
import { requestGoogleCode } from '../../core/auth/google-auth';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import type { University } from '../../types/api';

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

const institutions: Array<{ university: University; label: string; domain: string; className: string }> = [
  { university: 'KMITL', label: 'Sign in with KMITL Account', domain: '@kmitl.ac.th', className: 'institution-button--kmitl' },
  { university: 'KMUTT', label: 'Sign in with KMUTT Account', domain: '@mail.kmutt.ac.th', className: 'institution-button--kmutt' },
  { university: 'KMUTNB', label: 'Sign in with KMUTNB Account', domain: '@email.kmutnb.ac.th', className: 'institution-button--kmutnb' },
];

export function loginPage(context: RouteContext): PageView {
  const page = el('section', { className: 'login-page' });
  const intro = el('div', { className: 'login-brand' },
    el('div', { className: 'login-brand__mark', text: '✣' }),
    el('h1', { text: 'KingMongkut Social' }),
    el('p', {
      text: 'The social network for KMITL, KMUTT, and KMUTNB students. Connect, collaborate, and build the future together.',
    }),
  );

  const card = el('div', { className: 'login-card' },
    el('h2', { text: 'Choose your institution' }),
    el('p', { text: 'Sign in securely with your university Google account.' }),
  );

  const error = el('p', { className: 'form-error login-error', attrs: { role: 'alert' } });
  const buttons = el('div', { className: 'institution-buttons' });

  for (const institution of institutions) {
    const button = el('button', {
      className: `institution-button ${institution.className}`,
      attrs: { type: 'button', title: `Only ${institution.domain} accounts are allowed` },
    },
      el('span', { text: institution.label }),
      el('span', { className: 'institution-button__arrow', text: '→' }),
    );

    button.addEventListener('click', async () => {
      error.textContent = '';
      const allButtons = buttons.querySelectorAll<HTMLButtonElement>('button');
      allButtons.forEach((item) => { item.disabled = true; });
      const original = button.firstElementChild?.textContent ?? institution.label;
      if (button.firstElementChild) button.firstElementChild.textContent = 'Opening Google…';

      try {
        const code = await requestGoogleCode(institution.university);
        if (button.firstElementChild) button.firstElementChild.textContent = 'Signing in…';
        await authApi.googleLogin(code, institution.university);
        const returnTo = safeReturnTo(context.query.get('returnTo'));
        window.history.pushState(null, '', returnTo);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (cause) {
        error.textContent = errorMessage(cause);
        allButtons.forEach((item) => { item.disabled = false; });
        if (button.firstElementChild) button.firstElementChild.textContent = original;
      }
    });

    buttons.append(button);
  }

  card.append(
    buttons,
    error,
    el('div', { className: 'login-card__secure' },
      el('span', { text: '▣' }),
      el('span', { text: 'Secure Google SSO Authentication' }),
    ),
    el('p', { className: 'login-card__domains', text: 'Allowed: @kmitl.ac.th · @mail.kmutt.ac.th · @email.kmutnb.ac.th' }),
  );

  const legal = el('div', { className: 'login-legal' },
    el('span', { text: 'Privacy Policy' }),
    el('span', { text: '•' }),
    el('span', { text: 'Terms of Service' }),
    el('span', { text: '•' }),
    el('span', { text: 'Contact Support' }),
    el('small', { text: '© 2026 KingMongkut Social · Tri-Institute Engineering Exchange.' }),
  );

  page.append(intro, card, legal);
  return { title: 'Sign in', element: page };
}

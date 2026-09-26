import { authApi } from '../../core/auth/auth-api';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { googleErrorMessage } from '../../core/ui/error-message';

export function loginPage(context: RouteContext): PageView {
  const container = el('div', { className: 'auth-landing-page' });
  const hero = el('div', { className: 'auth-landing-hero' },
    el('h1', { className: 'auth-site-title', text: 'King’s society' }),
    el('p', { className: 'auth-site-description', text: 'พื้นที่แลกเปลี่ยนและเชื่อมต่อเพื่อนนักศึกษา 3 พระจอมฯ' }),
  );
  const card = el('section', { className: 'auth-sso-card' },
    el('h2', { className: 'auth-card-title', text: 'เข้าสู่ระบบหรือสมัครสมาชิก' }),
    el('p', { className: 'auth-card-subtitle', text: 'เลือกบัญชี Google ของมหาวิทยาลัย หากยังไม่มีบัญชี ระบบจะสมัครสมาชิกให้คุณ' }),
  );
  const errorCode = context.query.get('error');
  if (errorCode) {
    card.append(el('p', { className: 'form-error', text: googleErrorMessage(errorCode), attrs: { role: 'alert' } }));
  }
  const button = el('button', {
    className: 'google-sign-in', attrs: { type: 'button' },
  });
  const icon = el('span', { className: 'google-sign-in__icon', attrs: { 'aria-hidden': 'true' } });
  icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.02 46.98 31.87 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  button.append(icon, el('span', { text: 'ดำเนินการต่อด้วย Google' }));
  button.addEventListener('click', () => {
    authApi.startGoogleLogin(context.query.get('returnTo'));
  });
  const domains = el('ul', { className: 'auth-domain-list' },
    el('li', { text: 'สจล. · @kmitl.ac.th' }),
    el('li', { text: 'มจธ. · @mail.kmutt.ac.th' }),
    el('li', { text: 'มจพ. · @email.kmutnb.ac.th' }),
  );
  card.append(button, domains,
    el('p', { className: 'auth-card-subtitle', text: 'เมื่อเข้าใช้ครั้งแรก กรุณากรอกคณะและภาควิชาเพื่อทำโปรไฟล์ให้ครบ' }),
  );
  container.append(hero, card);
  return { title: 'เข้าสู่ระบบ', element: container };
}

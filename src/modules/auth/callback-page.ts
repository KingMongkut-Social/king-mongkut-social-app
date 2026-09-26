import { authStore } from '../../core/auth/auth-store';
import { afterLoginPath } from '../../core/auth/auth-navigation';
import { safeReturnTo } from '../../core/auth/return-to';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';

// main.ts restores the refresh cookie once before routing, including this callback.
export function callbackPage(context: RouteContext): PageView {
  const returnTo = safeReturnTo(context.query.get('returnTo'));
  return {
    title: 'กำลังเข้าสู่ระบบ', element: el('div'),
    redirectTo: authStore.snapshot.status === 'authenticated' ? afterLoginPath(returnTo)
      : '/login?error=GOOGLE_SESSION_FAILED&returnTo=' + encodeURIComponent(returnTo),
  };
}

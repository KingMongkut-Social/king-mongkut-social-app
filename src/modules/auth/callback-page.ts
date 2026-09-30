import { authStore } from '../../core/auth/auth-store';
import { apiClient } from '../../core/api/api-client';
import { afterLoginPath } from '../../core/auth/auth-navigation';
import { safeReturnTo } from '../../core/auth/return-to';
import type { PageView, RouteContext } from '../../core/router/router';
import { el } from '../../core/ui/dom';

// main.ts restores the refresh cookie once before routing. On the OAuth callback we
// make one additional recovery attempt because the browser has just crossed origins
// and a transient cookie/network delay should not turn a successful Google login into
// a false "session failed" screen.
export async function callbackPage(context: RouteContext): Promise<PageView> {
  const returnTo = safeReturnTo(context.query.get('returnTo'));

  if (authStore.snapshot.status !== 'authenticated') {
    await apiClient.restoreSession();
  }

  return {
    title: 'กำลังเข้าสู่ระบบ', element: el('div'),
    redirectTo: authStore.snapshot.status === 'authenticated' ? afterLoginPath(returnTo)
      : '/login?error=GOOGLE_SESSION_FAILED&returnTo=' + encodeURIComponent(returnTo),
  };
}

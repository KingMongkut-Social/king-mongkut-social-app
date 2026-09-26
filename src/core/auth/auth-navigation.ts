import { authStore } from './auth-store';
import { safeReturnTo } from './return-to';

export function afterLoginPath(returnTo: unknown): string {
  const target = safeReturnTo(returnTo);
  return authStore.snapshot.user?.needsProfileCompletion
    ? '/complete-profile?returnTo=' + encodeURIComponent(target) : target;
}

export function navigateTo(path: string, replace = false): void {
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function requireMember(): boolean {
  const state = authStore.snapshot;
  const returnTo = safeReturnTo(window.location.pathname + window.location.search);
  if (state.status !== 'authenticated') {
    navigateTo('/login?returnTo=' + encodeURIComponent(returnTo));
    return false;
  }
  if (state.user?.needsProfileCompletion) {
    navigateTo(afterLoginPath(returnTo));
    return false;
  }
  return true;
}

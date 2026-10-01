import { el } from './dom';

const glyphs: Record<string, string> = {
  post_reaction: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 20.2l7.8-6.8 1-1a5.5 5.5 0 0 0 0-7.8Z"/>',
  post_comment: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
  comment_reply: '<path d="m9 17-5-5 5-5"/><path d="M4 12h9a7 7 0 0 1 7 7v1"/>',
  friend_request: '<path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  friend_accept: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
  group_invite: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  group_join: '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="m17 11 2 2 4-4"/>',
  group_mention: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
};

export function createNotificationTypeBadge(type: string): HTMLElement {
  const badge = el('span', {
    className: 'notification-type-badge',
    attrs: { 'aria-hidden': 'true' },
  });
  const path = glyphs[type] ?? '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>';
  badge.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  return badge;
}

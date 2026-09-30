import { el } from './dom';
import { profileImageUrl } from '../../modules/profile/profile-api';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarOptions {
  url?: string | null | undefined;
  name?: string | null | undefined;
  initial?: string | undefined;
  size?: AvatarSize | number | undefined;
  alt?: string | undefined;
  className?: string | undefined;
  isOnline?: boolean | undefined;
  badge?: string | HTMLElement | undefined;
  linkHref?: string | undefined;
}

export function createAvatar(options: AvatarOptions): HTMLElement {
  const {
    url,
    name,
    size = 'md',
    alt,
    className = '',
    isOnline,
    badge,
    linkHref,
  } = options;

  const initial = options.initial
    || (name ? name.trim().charAt(0).toUpperCase() : 'ส')
    || 'ส';

  const sizeClass = typeof size === 'string' ? `app-avatar--${size}` : '';
  const rootTag = linkHref ? 'a' : 'span';
  const container = el(rootTag, {
    className: `app-avatar ${sizeClass} ${className}`.trim(),
    attrs: {
      ...(linkHref ? { href: linkHref } : {}),
      'aria-label': alt || (name ? `รูปของ ${name}` : 'รูปโปรไฟล์'),
    },
  });

  if (typeof size === 'number') {
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;
  }

  const initialSpan = el('span', { className: 'app-avatar__initial', text: initial });

  if (url) {
    const fullUrl = profileImageUrl(url);
    const img = el('img', {
      className: 'app-avatar__img',
      attrs: {
        src: fullUrl,
        alt: alt || name || '',
        loading: 'lazy',
        referrerpolicy: 'no-referrer',
      },
    });
    img.addEventListener('error', () => {
      img.remove();
      if (!container.contains(initialSpan)) {
        container.prepend(initialSpan);
      }
    }, { once: true });
    container.append(img);
  } else {
    container.append(initialSpan);
  }

  if (isOnline !== undefined) {
    container.append(el('span', {
      className: `app-avatar__status-dot ${isOnline ? 'app-avatar__status-dot--online' : 'app-avatar__status-dot--offline'}`,
      attrs: { title: isOnline ? 'กำลังออนไลน์' : 'ออฟไลน์' },
    }));
  }

  if (badge) {
    if (typeof badge === 'string') {
      container.append(el('span', { className: 'app-avatar__badge', text: badge }));
    } else {
      container.append(badge);
    }
  }

  return container;
}

export function createUniversityBadge(
  university: string | null | undefined,
  options: { className?: string; subtle?: boolean } = {},
): HTMLElement {
  const code = (university || '').toUpperCase();
  let badgeClass = 'badge-tag--tech-uni';
  if (code.includes('KMITL') || code.includes('สจล')) badgeClass = 'badge-tag--kmitl';
  else if (code.includes('KMUTT') || code.includes('มจธ')) badgeClass = 'badge-tag--kmutt';
  else if (code.includes('KMUTNB') || code.includes('มจพ')) badgeClass = 'badge-tag--kmutnb';

  return el('span', {
    className: `badge-tag ${badgeClass} ${options.className ?? ''}`.trim(),
    text: university || '3 พระจอมฯ',
  });
}

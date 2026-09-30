import { el } from './dom';

export interface EmptyStateOptions {
  icon?: string | undefined;
  title: string;
  description: string;
  actionText?: string | undefined;
  actionHref?: string | undefined;
  onAction?: (() => void) | undefined;
}

export function createEmptyState(options: EmptyStateOptions): HTMLElement {
  const container = el('div', { className: 'empty-state', attrs: { role: 'status' } });

  const iconWrap = el('div', { className: 'empty-state__icon', attrs: { 'aria-hidden': 'true' } });
  iconWrap.innerHTML = options.icon || `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;

  const title = el('h3', { className: 'empty-state__title', text: options.title });
  const desc = el('p', { className: 'empty-state__description', text: options.description });

  container.append(iconWrap, title, desc);

  if (options.actionText) {
    if (options.actionHref) {
      const link = el('a', {
        className: 'button button--primary empty-state__action',
        attrs: { href: options.actionHref },
        text: options.actionText,
      });
      container.append(link);
    } else if (options.onAction) {
      const button = el('button', {
        className: 'button button--primary empty-state__action',
        attrs: { type: 'button' },
        text: options.actionText,
      });
      button.addEventListener('click', options.onAction);
      container.append(button);
    }
  }

  return container;
}

export interface ErrorStateOptions {
  title?: string | undefined;
  message: string;
  onRetry?: (() => void) | undefined;
}

export function createErrorState(options: ErrorStateOptions): HTMLElement {
  const container = el('div', { className: 'empty-state error-state', attrs: { role: 'alert' } });

  const iconWrap = el('div', { className: 'empty-state__icon', attrs: { 'aria-hidden': 'true' } });
  iconWrap.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  const title = el('h3', { className: 'empty-state__title', text: options.title || 'เกิดข้อผิดพลาด' });
  const desc = el('p', { className: 'empty-state__description', text: options.message });

  container.append(iconWrap, title, desc);

  if (options.onRetry) {
    const retryBtn = el('button', {
      className: 'button button--secondary empty-state__action',
      attrs: { type: 'button' },
      text: 'ลองอีกครั้ง',
    });
    retryBtn.addEventListener('click', options.onRetry);
    container.append(retryBtn);
  }

  return container;
}

export function createPostSkeleton(count = 2): HTMLElement {
  const wrap = el('div', { className: 'skeletons-wrap' });
  for (let i = 0; i < count; i++) {
    const card = el('div', { className: 'skeleton-post-card' });
    const header = el('div', { className: 'skeleton-post-card__header' });
    header.append(
      el('div', { className: 'skeleton skeleton-avatar skeleton-avatar--md' }),
      el('div', { attrs: { style: 'flex: 1;' } },
        el('div', { className: 'skeleton skeleton-text skeleton-text--title' }),
        el('div', { className: 'skeleton skeleton-text skeleton-text--short' }),
      ),
    );
    card.append(
      header,
      el('div', { className: 'skeleton skeleton-post-card__body' }),
    );
    wrap.append(card);
  }
  return wrap;
}

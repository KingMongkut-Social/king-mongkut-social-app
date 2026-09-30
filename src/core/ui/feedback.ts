import { el } from './dom';
import { reactIcon, type AppIconName } from './react-icon';

export interface EmptyStateOptions {
  icon?: string | undefined;
  iconName?: AppIconName | undefined;
  title: string;
  description: string;
  actionText?: string | undefined;
  actionHref?: string | undefined;
  onAction?: (() => void) | undefined;
  secondaryActionText?: string | undefined;
  secondaryActionHref?: string | undefined;
  onSecondaryAction?: (() => void) | undefined;
}

function emptyAction(
  text: string,
  variant: 'primary' | 'secondary',
  href?: string,
  onClick?: () => void,
): HTMLElement {
  if (href) {
    return el('a', {
      className: `button button--${variant} empty-state__action`,
      attrs: { href },
      text,
    });
  }
  const button = el('button', {
    className: `button button--${variant} empty-state__action`,
    attrs: { type: 'button' },
    text,
  });
  if (onClick) button.addEventListener('click', onClick);
  return button;
}

export function createEmptyState(options: EmptyStateOptions): HTMLElement {
  const container = el('div', { className: 'empty-state', attrs: { role: 'status' } });
  const iconWrap = el('div', { className: 'empty-state__icon', attrs: { 'aria-hidden': 'true' } });

  if (options.iconName) iconWrap.append(reactIcon(options.iconName, { size: 32 }));
  else if (options.icon) iconWrap.innerHTML = options.icon;
  else iconWrap.append(reactIcon('info', { size: 32 }));

  const title = el('h3', { className: 'empty-state__title', text: options.title });
  const desc = el('p', { className: 'empty-state__description', text: options.description });
  container.append(iconWrap, title, desc);

  const actions = el('div', { className: 'empty-state__actions' });
  if (options.actionText) {
    actions.append(emptyAction(options.actionText, 'primary', options.actionHref, options.onAction));
  }
  if (options.secondaryActionText) {
    actions.append(emptyAction(
      options.secondaryActionText,
      'secondary',
      options.secondaryActionHref,
      options.onSecondaryAction,
    ));
  }
  if (actions.childElementCount) container.append(actions);

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
  iconWrap.append(reactIcon('warning', { size: 32 }));

  const title = el('h3', { className: 'empty-state__title', text: options.title || 'เกิดข้อผิดพลาด' });
  const desc = el('p', { className: 'empty-state__description', text: options.message });
  container.append(iconWrap, title, desc);

  if (options.onRetry) {
    const actions = el('div', { className: 'empty-state__actions' });
    actions.append(emptyAction('ลองอีกครั้ง', 'secondary', undefined, options.onRetry));
    container.append(actions);
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

import { el } from './dom';

type ToastKind = 'success' | 'error' | 'info';

function show(message: string, kind: ToastKind): void {
  const root = document.querySelector<HTMLDivElement>('#toast-root');
  if (!root) return;

  const toast = el('div', {
    className: `toast toast--${kind}`,
    attrs: { role: kind === 'error' ? 'alert' : 'status' },
  });
  toast.append(el('span', { text: message }));

  const close = el('button', {
    className: 'toast__close',
    text: '×',
    attrs: { type: 'button', 'aria-label': 'Dismiss notification' },
  });
  close.addEventListener('click', () => toast.remove());
  toast.append(close);
  root.append(toast);

  window.setTimeout(() => toast.remove(), 5000);
}

export const toast = {
  success: (message: string) => show(message, 'success'),
  error: (message: string) => show(message, 'error'),
  info: (message: string) => show(message, 'info'),
};

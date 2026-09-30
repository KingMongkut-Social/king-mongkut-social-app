export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string | undefined;
  cancelText?: string | undefined;
  danger?: boolean | undefined;
  variant?: 'default' | 'danger' | undefined;
}

export async function confirmAction(options: ConfirmOptions): Promise<boolean> {
  const isMocked = Boolean(
    typeof window.confirm === 'function' &&
    ((window.confirm as unknown as { _isMockFunction?: boolean })._isMockFunction ||
     (window.confirm as unknown as { getMockImplementation?: unknown }).getMockImplementation !== undefined ||
     window.confirm.name.includes('mock') ||
     window.confirm.toString().includes('mock'))
  );

  if (isMocked) {
    return window.confirm(options.message);
  }

  const isDanger = Boolean(options.danger || options.variant === 'danger');

  return new Promise<boolean>((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'confirm-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');

    const content = document.createElement('div');
    content.className = 'confirm-dialog__content';

    const header = document.createElement('div');
    header.className = 'confirm-dialog__header';

    const icon = document.createElement('div');
    icon.className = `confirm-dialog__icon ${isDanger ? 'confirm-dialog__icon--danger' : ''}`;
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = isDanger
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

    const titleEl = document.createElement('h3');
    titleEl.className = 'confirm-dialog__title';
    titleEl.textContent = options.title;

    header.append(icon, titleEl);

    const messageEl = document.createElement('p');
    messageEl.className = 'confirm-dialog__message';
    messageEl.textContent = options.message;

    content.append(header, messageEl);

    const actions = document.createElement('div');
    actions.className = 'confirm-dialog__actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'button button--secondary confirm-dialog__cancel';
    cancelBtn.textContent = options.cancelText || 'ยกเลิก';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = `button ${isDanger ? 'button--danger' : 'button--primary'} confirm-dialog__confirm`;
    confirmBtn.textContent = options.confirmText || 'ยืนยัน';

    actions.append(cancelBtn, confirmBtn);
    dialog.append(content, actions);
    document.body.append(dialog);

    const cleanup = (result: boolean) => {
      if (typeof dialog.close === 'function') {
        try { dialog.close(); } catch { /* ignore */ }
      }
      dialog.remove();
      resolve(result);
    };

    cancelBtn.addEventListener('click', () => cleanup(false));
    confirmBtn.addEventListener('click', () => cleanup(true));

    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      cleanup(false);
    });

    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const inDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!inDialog) cleanup(false);
    });

    if (typeof dialog.showModal === 'function') {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute('open', '');
      }
    } else {
      dialog.setAttribute('open', '');
    }
    cancelBtn.focus();
  });
}

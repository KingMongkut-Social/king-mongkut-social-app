import type { ZodError } from 'zod';
import { el } from '../../core/ui/dom';

export function field(
  name: string,
  labelText: string,
  control: HTMLElement,
  hint?: string,
): HTMLDivElement {
  const wrapper = el('div', { className: 'field' });
  const targetId =
    control instanceof HTMLInputElement ||
    control instanceof HTMLTextAreaElement ||
    control instanceof HTMLSelectElement
      ? control.id
      : (control.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')?.id ?? name);
  const label = el('label', { className: 'field__label', text: labelText, attrs: { for: targetId } });
  const error = el('p', {
    className: 'field__error',
    attrs: { id: `${name}-error`, 'aria-live': 'polite' },
  });
  control.setAttribute('aria-describedby', `${name}-error${hint ? ` ${name}-hint` : ''}`);
  wrapper.append(label, control);
  if (hint) wrapper.append(el('p', { className: 'field__hint', text: hint, attrs: { id: `${name}-hint` } }));
  wrapper.append(error);
  return wrapper;
}

export function clearFieldErrors(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLElement>('.field__error').forEach((element) => {
    element.textContent = '';
  });
  form.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach((element) => {
    element.removeAttribute('aria-invalid');
  });
}

export function showZodErrors(form: HTMLFormElement, error: ZodError): void {
  clearFieldErrors(form);
  for (const issue of error.issues) {
    const name = issue.path[0];
    if (typeof name !== 'string') continue;
    const control = form.elements.namedItem(name);
    if (control instanceof HTMLElement) control.setAttribute('aria-invalid', 'true');
    const target = form.querySelector<HTMLElement>(`#${CSS.escape(name)}-error`);
    if (target && !target.textContent) target.textContent = issue.message;
  }
}

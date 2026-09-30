import { reactIcon, type AppIconName } from './react-icon';

export interface ElementOptions {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  ...children: Node[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {})) {
    element.setAttribute(name, value);
  }
  element.append(...children);
  return element;
}

export function clear(element: Element): void {
  element.replaceChildren();
}

export function icon(name: 'arrow' | 'edit' | 'plus' | 'trash' | 'user'): HTMLSpanElement {
  const icons: Record<typeof name, AppIconName> = {
    arrow: 'arrow-right',
    edit: 'edit',
    plus: 'plus',
    trash: 'trash',
    user: 'user',
  };
  return el('span', { className: 'icon', attrs: { 'aria-hidden': 'true' } }, reactIcon(icons[name]));
}

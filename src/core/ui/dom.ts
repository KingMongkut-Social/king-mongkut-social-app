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
  const glyphs = {
    arrow: '→',
    edit: '✎',
    plus: '+',
    trash: '×',
    user: '●',
  } as const;
  return el('span', { className: 'icon', text: glyphs[name], attrs: { 'aria-hidden': 'true' } });
}

import { el } from '../../core/ui/dom';
import type { AcademicSuggestion } from './academic-data';

export interface AcademicComboboxOptions {
  id: string;
  name: string;
  placeholder?: string;
  initialValue?: string;
  maxLength?: number;
  inputClassName?: string;
  getSuggestions: (query: string) => AcademicSuggestion[];
  onSelect?: (value: string) => void;
  ariaDescribedBy?: string;
}

export interface AcademicComboboxInstance {
  container: HTMLElement;
  input: HTMLInputElement;
  setValue: (value: string) => void;
  getValue: () => string;
  refresh: () => void;
  open: () => void;
  close: () => void;
}

export function createAcademicCombobox(options: AcademicComboboxOptions): AcademicComboboxInstance {
  const container = el('div', { className: 'academic-combobox' });
  const wrapper = el('div', { className: 'academic-combobox__wrapper' });

  const inputAttrs: Record<string, string> = {
    id: options.id,
    name: options.name,
    type: 'text',
    autocomplete: 'off',
    maxlength: String(options.maxLength ?? 150),
    placeholder: options.placeholder ?? '',
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': 'false',
  };
  if (options.ariaDescribedBy) {
    inputAttrs['aria-describedby'] = options.ariaDescribedBy;
  }

  const input = el('input', {
    className: options.inputClassName || 'input academic-combobox__input',
    attrs: inputAttrs,
  });

  input.value = options.initialValue ?? '';

  // Clear button
  const clearBtn = el('button', {
    className: 'academic-combobox__clear',
    attrs: {
      type: 'button',
      tabindex: '-1',
      'aria-label': 'ล้างข้อความ',
      title: 'ล้างข้อความ',
      style: input.value ? 'display: flex;' : 'display: none;',
    },
    text: '✕',
  });

  // Toggle button (chevron)
  const toggleBtn = el('button', {
    className: 'academic-combobox__toggle',
    attrs: {
      type: 'button',
      tabindex: '-1',
      'aria-label': 'แสดงตัวเลือกทั้งหมด',
      title: 'แสดงตัวเลือกทั้งหมด',
    },
  });
  toggleBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `;

  const popover = el('div', {
    className: 'academic-combobox__popover',
    attrs: {
      role: 'listbox',
      style: 'display: none;',
    },
  });

  wrapper.append(input, clearBtn, toggleBtn);
  container.append(wrapper, popover);

  let isOpen = false;
  let isSelecting = false;
  let activeIndex = -1;
  let currentSuggestions: AcademicSuggestion[] = [];

  const updateClearVisibility = () => {
    clearBtn.style.display = input.value.trim() ? 'flex' : 'none';
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    popover.style.display = 'none';
    input.setAttribute('aria-expanded', 'false');
    activeIndex = -1;
  };

  const selectSuggestion = (suggestion: AcademicSuggestion) => {
    isSelecting = true;
    input.value = suggestion.value;
    updateClearVisibility();
    close();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    isSelecting = false;
    options.onSelect?.(suggestion.value);
  };

  const renderSuggestions = (suggestions: AcademicSuggestion[]) => {
    currentSuggestions = suggestions;
    popover.innerHTML = '';
    activeIndex = -1;

    if (suggestions.length === 0) {
      const query = input.value.trim();
      const emptyWrap = el('div', { className: 'academic-combobox__empty' });
      if (query) {
        const customBtn = el('button', {
          className: 'academic-combobox__item academic-combobox__item--custom',
          attrs: { type: 'button' },
          text: `➕ ใช้ "${query}" เป็นข้อมูลที่คุณระบุเอง`,
        });
        customBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          selectSuggestion({ value: query, isCustom: true });
        });
        emptyWrap.append(customBtn);
      } else {
        emptyWrap.textContent = 'ไม่พบข้อมูลในรายการ - สามารถพิมพ์ชื่อเพื่อระบุเองได้';
      }
      popover.append(emptyWrap);
      return;
    }

    let lastGroup: string | undefined = undefined;

    suggestions.forEach((item, index) => {
      if (item.group && item.group !== lastGroup) {
        lastGroup = item.group;
        const groupEl = el('div', {
          className: 'academic-combobox__group-header',
          text: item.group,
        });
        popover.append(groupEl);
      }

      const itemEl = el('div', {
        className: `academic-combobox__item${item.isCustom ? ' academic-combobox__item--custom' : ''}`,
        attrs: {
          role: 'option',
          id: `${options.id}-opt-${index}`,
          'data-index': String(index),
        },
      });

      const labelEl = el('span', {
        className: 'academic-combobox__item-text',
        text: item.label || item.value,
      });
      itemEl.append(labelEl);

      if (item.badge) {
        const badgeEl = el('span', {
          className: `badge-tag ${item.badgeClass || 'badge-tag--tech-uni'} academic-combobox__item-badge`,
          text: item.badge,
        });
        itemEl.append(badgeEl);
      }

      itemEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectSuggestion(item);
      });

      itemEl.addEventListener('mouseenter', () => {
        setActiveIndex(index, false);
      });

      popover.append(itemEl);
    });
  };

  const setActiveIndex = (index: number, scrollIntoView = true) => {
    const items = popover.querySelectorAll<HTMLElement>('.academic-combobox__item');
    items.forEach((it) => it.classList.remove('is-active'));

    if (index >= 0 && index < items.length) {
      activeIndex = index;
      const target = items[index];
      if (!target) {
        activeIndex = -1;
        input.removeAttribute('aria-activedescendant');
        return;
      }
      target.classList.add('is-active');
      input.setAttribute('aria-activedescendant', target.id);
      if (scrollIntoView && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ block: 'nearest' });
      }
    } else {
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
    }
  };

  const open = () => {
    const suggestions = options.getSuggestions(input.value);
    renderSuggestions(suggestions);
    popover.style.display = 'block';
    isOpen = true;
    input.setAttribute('aria-expanded', 'true');
  };

  // Input event listeners
  input.addEventListener('focus', () => {
    open();
  });

  input.addEventListener('input', () => {
    if (isSelecting) return;
    updateClearVisibility();
    open();
  });

  input.addEventListener('keydown', (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      open();
      return;
    }

    if (!isOpen) return;

    const items = popover.querySelectorAll<HTMLElement>('.academic-combobox__item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
      setActiveIndex(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
      setActiveIndex(prev);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < currentSuggestions.length) {
        e.preventDefault();
        const suggestion = currentSuggestions[activeIndex];
        if (suggestion) selectSuggestion(suggestion);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    input.value = '';
    updateClearVisibility();
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    options.onSelect?.('');
    open();
  });

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (isOpen) {
      close();
    } else {
      input.focus();
      open();
    }
  });

  // Close when clicking outside
  const handleDocumentClick = (e: MouseEvent) => {
    if (!container.contains(e.target as Node)) {
      close();
    }
  };
  document.addEventListener('mousedown', handleDocumentClick);

  return {
    container,
    input,
    setValue: (val: string) => {
      input.value = val;
      updateClearVisibility();
    },
    getValue: () => input.value,
    refresh: () => {
      if (isOpen) {
        const suggestions = options.getSuggestions(input.value);
        renderSuggestions(suggestions);
      }
    },
    open,
    close,
  };
}

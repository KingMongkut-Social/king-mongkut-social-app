import {
  searchFriends,
  sendFriendRequest,
  respondFriendRequest,
  type FriendUser,
} from './friends-api.js';

function el(
  tag: string,
  props: any = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElement {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'className') {
      element.className = String(value);
    } else if (key === 'disabled') {
      (element as any).disabled = Boolean(value);
    } else {
      element.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child == null) continue;
    element.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return element;
}

export function renderConnectionsPage(): HTMLElement {
  let currentSearch = '';
  let currentUni = 'All';
  let debounceTimer: any = null;

  const container = el('div', { className: 'page-shell connections-page' });

  const header = el(
    'div',
    { className: 'connections-header' },
    el('h1', { className: 'page-title' }, 'Connections'),
    el('p', { className: 'page-subtitle' }, 'Manage your academic network across institutions.'),
  );

  const searchInput = el('input', {
    type: 'search',
    className: 'input-field search-input',
    placeholder: 'Search students by name...',
    oninput: (e: Event) => {
      clearTimeout(debounceTimer);
      currentSearch = (e.target as HTMLInputElement).value.trim();
      debounceTimer = setTimeout(() => {
        void loadUsers();
      }, 300);
    },
  });

  const universities = ['All', 'KMITL', 'KMUTT', 'KMUTNB'];
  const filterChipsContainer = el('div', { className: 'filter-chips-group' });

universities.forEach((uni) => {
  const chip = el(
    'button',
    {
      type: 'button',
      className: `chip-button ${currentUni === uni ? 'chip-button--active' : ''}`,
      onclick: () => {
        currentUni = uni;
        const buttons = filterChipsContainer.querySelectorAll('.chip-button');
        buttons.forEach((c: any) => {
          c.classList.toggle('chip-button--active', c.textContent === uni);
        });
        void loadUsers();
      },
    },
    uni,
  );
  filterChipsContainer.appendChild(chip);
});

  const cardsGrid = el('div', { className: 'connections-grid' });

  function renderActionButton(user: FriendUser): HTMLElement {
    if (user.relationshipStatus === 'friends') {
      return el('button', { className: 'button button--outline', disabled: true }, '✓ Friends');
    }

    if (user.relationshipStatus === 'pending_sent') {
      return el('button', { className: 'button button--subtle', disabled: true }, 'Requested');
    }

    if (user.relationshipStatus === 'pending_received' && user.requestId) {
      const btnGroup = el('div', { className: 'action-btn-group' });

      const acceptBtn = el(
        'button',
        {
          className: 'button button--primary',
          onclick: async () => {
            acceptBtn.textContent = 'Accepting...';
            (acceptBtn as HTMLButtonElement).disabled = true;
            await respondFriendRequest(user.requestId!, 'accept');
            await loadUsers();
          },
        },
        '✓ Accept Request',
      );

      const rejectBtn = el(
        'button',
        {
          className: 'button button--outline reject-btn',
          onclick: async () => {
            (rejectBtn as HTMLButtonElement).disabled = true;
            await respondFriendRequest(user.requestId!, 'reject');
            await loadUsers();
          },
        },
        '✕',
      );

      btnGroup.appendChild(acceptBtn);
      btnGroup.appendChild(rejectBtn);
      return btnGroup;
    }

    const addBtn = el(
      'button',
      {
        className: 'button button--primary',
        onclick: async () => {
          addBtn.textContent = 'Adding...';
          (addBtn as HTMLButtonElement).disabled = true;
          await sendFriendRequest(user.id);
          await loadUsers();
        },
      },
      '+ Add Friend',
    );
    return addBtn;
  }

  function renderUserCard(user: FriendUser): HTMLElement {
    const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';

    return el(
      'div',
      { className: 'card connection-card' },
      el(
        'div',
        { className: 'connection-card__header' },
        el('div', { className: 'avatar-placeholder' }, initial),
        el(
          'div',
          { className: 'connection-card__meta' },
          el('h3', { className: 'connection-name' }, user.name),
          el('span', { className: `badge-uni badge-uni--${user.university.toLowerCase()}` }, user.university),
        ),
      ),
      el('div', { className: 'connection-card__footer' }, renderActionButton(user)),
    );
  }

  async function loadUsers() {
    cardsGrid.innerHTML = 'Searching...';
    try {
    const users = await searchFriends(currentSearch, currentUni);
    cardsGrid.innerHTML = '';
        if (!users || users.length === 0) {
            cardsGrid.innerHTML = 'No students found.';
            return;
        }
        users.forEach((u) => cardsGrid.appendChild(renderUserCard(u)));
        } catch (err: any) {
        cardsGrid.innerHTML = `Error: ${err?.message ?? 'Failed to load'}`;
        }
    }
    container.appendChild(header);
    container.appendChild(searchInput);
    container.appendChild(filterChipsContainer);
    container.appendChild(cardsGrid);

    void loadUsers();

    return container;
}
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import type { University } from '../../types/api';
import {
  respondFriendRequest,
  searchFriends,
  sendFriendRequest,
  type FriendUser,
} from './friends-api';

type UniversityFilter = University | 'All';

function userAvatar(user: FriendUser): HTMLElement {
  const wrapper = el('span', { className: 'avatar-placeholder' });
  if (user.avatarUrl) {
    wrapper.append(el('img', { attrs: { src: user.avatarUrl, alt: '' } }));
  } else {
    wrapper.textContent = user.name.charAt(0).toUpperCase() || '?';
  }
  return wrapper;
}

export function renderConnectionsPage(): HTMLElement {
  let currentSearch = '';
  let currentUniversity: UniversityFilter = 'All';
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const container = el('div', { className: 'page-shell connections-page' });
  const header = el('div', { className: 'connections-header' },
    el('h1', { className: 'page-title', text: 'Connections' }),
    el('p', { className: 'page-subtitle', text: 'Manage your academic network across institutions.' }),
  );

  const cardsGrid = el('div', { className: 'connections-grid' });
  const searchInput = el('input', {
    className: 'input search-input',
    attrs: {
      type: 'search',
      placeholder: 'Search students by name...',
      'aria-label': 'Search students',
    },
  });

  searchInput.addEventListener('input', () => {
    if (debounceTimer !== undefined) clearTimeout(debounceTimer);
    currentSearch = searchInput.value.trim();
    debounceTimer = setTimeout(() => {
      void loadUsers();
    }, 300);
  });

  const universities: UniversityFilter[] = ['All', 'KMITL', 'KMUTT', 'KMUTNB'];
  const filterChipsContainer = el('div', { className: 'filter-chips-group' });

  const refreshChipState = (): void => {
    for (const button of filterChipsContainer.querySelectorAll<HTMLButtonElement>('.chip-button')) {
      button.classList.toggle('chip-button--active', button.dataset.university === currentUniversity);
    }
  };

  for (const university of universities) {
    const chip = el('button', {
      className: 'chip-button',
      text: university,
      attrs: { type: 'button', 'data-university': university },
    });
    chip.addEventListener('click', () => {
      currentUniversity = university;
      refreshChipState();
      void loadUsers();
    });
    filterChipsContainer.append(chip);
  }
  refreshChipState();

  function renderActionButton(user: FriendUser): HTMLElement {
    if (user.relationshipStatus === 'friends') {
      const button = el('button', {
        className: 'button button--outline',
        text: '✓ Friends',
        attrs: { type: 'button' },
      });
      button.disabled = true;
      return button;
    }

    if (user.relationshipStatus === 'pending_sent') {
      const button = el('button', {
        className: 'button button--subtle',
        text: 'Requested',
        attrs: { type: 'button' },
      });
      button.disabled = true;
      return button;
    }

    const requestId = user.requestId;
    if (user.relationshipStatus === 'pending_received' && requestId) {
      const group = el('div', { className: 'action-btn-group' });
      const accept = el('button', {
        className: 'button button--primary',
        text: '✓ Accept Request',
        attrs: { type: 'button' },
      });
      const reject = el('button', {
        className: 'button button--outline reject-btn',
        text: '✕',
        attrs: { type: 'button', 'aria-label': 'Reject friend request' },
      });

      accept.addEventListener('click', async () => {
        accept.disabled = true;
        reject.disabled = true;
        accept.textContent = 'Accepting…';
        try {
          await respondFriendRequest(requestId, 'accept');
          await loadUsers();
        } catch (cause) {
          toast.error(errorMessage(cause));
          accept.disabled = false;
          reject.disabled = false;
          accept.textContent = '✓ Accept Request';
        }
      });

      reject.addEventListener('click', async () => {
        accept.disabled = true;
        reject.disabled = true;
        try {
          await respondFriendRequest(requestId, 'reject');
          await loadUsers();
        } catch (cause) {
          toast.error(errorMessage(cause));
          accept.disabled = false;
          reject.disabled = false;
        }
      });

      group.append(accept, reject);
      return group;
    }

    const add = el('button', {
      className: 'button button--primary',
      text: '+ Add Friend',
      attrs: { type: 'button' },
    });
    add.addEventListener('click', async () => {
      add.disabled = true;
      add.textContent = 'Adding…';
      try {
        await sendFriendRequest(user.id);
        await loadUsers();
      } catch (cause) {
        toast.error(errorMessage(cause));
        add.disabled = false;
        add.textContent = '+ Add Friend';
      }
    });
    return add;
  }

  function renderUserCard(user: FriendUser): HTMLElement {
    return el('article', { className: 'card connection-card' },
      el('div', { className: 'connection-card__header' },
        userAvatar(user),
        el('div', { className: 'connection-card__meta' },
          el('h3', { className: 'connection-name', text: user.name }),
          el('span', {
            className: `badge-uni badge-uni--${user.university.toLowerCase()}`,
            text: user.university,
          }),
        ),
      ),
      el('div', { className: 'connection-card__footer' }, renderActionButton(user)),
    );
  }

  async function loadUsers(): Promise<void> {
    cardsGrid.replaceChildren(el('p', { className: 'status-msg', text: 'Searching…' }));
    try {
      const users = await searchFriends(currentSearch, currentUniversity);
      if (users.length === 0) {
        cardsGrid.replaceChildren(el('p', { className: 'status-msg', text: 'No students found.' }));
        return;
      }
      cardsGrid.replaceChildren(...users.map(renderUserCard));
    } catch (cause) {
      cardsGrid.replaceChildren(el('p', {
        className: 'status-msg',
        text: `Could not load connections: ${errorMessage(cause)}`,
      }));
    }
  }

  container.append(header, searchInput, filterChipsContainer, cardsGrid);
  void loadUsers();
  return container;
}

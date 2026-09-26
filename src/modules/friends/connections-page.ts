import {
  searchFriends,
  sendFriendRequest,
  respondFriendRequest,
  type FriendUser,
} from './friends-api';

interface DomProps {
  className?: string;
  type?: string;
  disabled?: boolean;
  style?: string;
  onclick?: (e: MouseEvent) => void | Promise<void>;
  text?: string;
  attrs?: Record<string, string>;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: DomProps = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (props.className) element.className = props.className;
  if (props.style) element.setAttribute('style', props.style);
  if (props.text) element.textContent = props.text;
  if (props.type && 'type' in element) {
    (element as HTMLButtonElement | HTMLInputElement).type = props.type;
  }
  if (props.disabled && 'disabled' in element) {
    (element as HTMLButtonElement | HTMLInputElement).disabled = props.disabled;
  }
  if (props.onclick) {
    element.addEventListener('click', props.onclick as EventListener);
  }
  if (props.attrs) {
    for (const [key, value] of Object.entries(props.attrs)) {
      element.setAttribute(key, value);
    }
  }
  for (const child of children) {
    if (child == null) continue;
    element.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return element;
}

export function renderConnectionsPage(): HTMLElement {
  let currentUni = 'All';
  let activeTab = 'แนะนำสำหรับคุณ';

  const container = el('div', { className: 'connections-page-wrap' });

  // 1. Top Bar: Title on Left, Filter Pills on Right (Image 3)
  const topBar = el('div', { className: 'connections-top-bar' });
  const titleBlock = el('div', {},
    el('h1', { className: 'connections-page-title', text: 'เพื่อน & การเชื่อมต่อ' }),
    el('p', { className: 'connections-page-subtitle', text: 'จัดการเครือข่ายเพื่อนนักศึกษาและอาจารย์ 3 สถาบันพระจอมเกล้า' }),
  );

  const filterPills = el('div', { className: 'connections-filter-pills' });
  const uniOptions = [
    { key: 'All', label: 'ทั้งหมด' },
    { key: 'KMITL', label: 'KMITL (ลาดกระบัง)' },
    { key: 'KMUTT', label: 'KMUTT (บางมด)' },
    { key: 'KMUTNB', label: 'KMUTNB (พระนครเหนือ)' },
  ];

  uniOptions.forEach(({ key, label }) => {
    const pill = el('button', {
      type: 'button',
      className: `filter-pill ${currentUni === key ? 'filter-pill--active' : ''}`,
      onclick: () => {
        currentUni = key;
        filterPills.querySelectorAll('.filter-pill').forEach((btn) => {
          btn.classList.toggle('filter-pill--active', btn.textContent === label);
        });
        void loadUsers();
      },
    }, label);
    filterPills.appendChild(pill);
  });

  const facultyDropdown = el('button', {
    type: 'button',
    className: 'filter-pill',
  }, 'ทุกคณะ ⌄');

  const deptDropdown = el('button', {
    type: 'button',
    className: 'filter-pill',
  }, 'ทุกภาควิชา ⌄');

  filterPills.append(facultyDropdown, deptDropdown);
  topBar.append(titleBlock, filterPills);

  // 2. Subtabs: แนะนำสำหรับคุณ, คำขอเป็นเพื่อน (3), เพื่อนของฉัน (Image 3)
  const subtabs = el('div', { className: 'connections-subtabs' });
  const tabsList = ['แนะนำสำหรับคุณ', 'คำขอเป็นเพื่อน (3)', 'เพื่อนของฉัน'];

  tabsList.forEach((tab) => {
    const tabBtn = el('button', {
      type: 'button',
      className: `subtab-btn ${activeTab === tab ? 'subtab-btn--active' : ''}`,
      onclick: () => {
        activeTab = tab;
        subtabs.querySelectorAll('.subtab-btn').forEach((b) => {
          b.classList.toggle('subtab-btn--active', b.textContent === tab);
        });
        void loadUsers();
      },
    }, tab);
    subtabs.appendChild(tabBtn);
  });

  // 3. Grid of Cards
  const cardsGrid = el('div', { className: 'connections-cards-grid' });

  function renderActionButton(user: FriendUser): HTMLElement {
    if (user.relationshipStatus === 'friends') {
      return el('button', { className: 'btn-add-friend', disabled: true, style: 'background:#e2ddd5; color:#554c44; cursor:default;' }, '✓ เพื่อนกันแล้ว');
    }

    if (user.relationshipStatus === 'pending_sent') {
      return el('button', { className: 'btn-add-friend', disabled: true, style: 'background:#ebdcd3; color:#a83800; cursor:default;' }, 'ส่งคำขอแล้ว');
    }

    if (user.relationshipStatus === 'pending_received' && user.requestId) {
      const btnGroup = el('div', { className: 'student-card-footer' });

      const acceptBtn = el('button', {
        className: 'btn-accept-request',
        onclick: async () => {
          acceptBtn.textContent = 'กำลังยอมรับ...';
          acceptBtn.disabled = true;
          await respondFriendRequest(user.requestId!, 'accept');
          await loadUsers();
        },
      }, '✓ ยอมรับคำขอ');

      const rejectBtn = el('button', {
        className: 'btn-reject-icon',
        onclick: async () => {
          rejectBtn.disabled = true;
          await respondFriendRequest(user.requestId!, 'reject');
          await loadUsers();
        },
      }, '✕');

      btnGroup.appendChild(acceptBtn);
      btnGroup.appendChild(rejectBtn);
      return btnGroup;
    }

    const addBtn = el('button', {
      className: 'btn-add-friend',
      onclick: async () => {
        addBtn.textContent = 'กำลังเพิ่มเพื่อน...';
        addBtn.disabled = true;
        await sendFriendRequest(user.id);
        await loadUsers();
      },
    }, '+ เพิ่มเพื่อน');

    const footer = el('div', { className: 'student-card-footer' }, addBtn);
    return footer;
  }

  function renderStudentCard(user: {
    name: string;
    headline?: string;
    university: string;
    faculty?: string;
    major?: string;
    bio?: string;
    initial?: string;
    actionType?: 'add' | 'accept' | 'friends';
    raw?: FriendUser;
  }): HTMLElement {
    const card = el('div', { className: 'student-card' });
    const header = el('div', { className: 'student-card-header' });

    const avatar = el('div', { className: 'student-avatar' }, user.initial || user.name.charAt(0).toUpperCase());
    const info = el('div', { className: 'student-info' });

    const name = el('h3', { className: 'student-name' }, user.name);
    const headline = el('span', { className: 'student-headline' }, user.headline || 'นักศึกษา 3 พระจอมฯ');

    const uniLower = user.university.toLowerCase();
    const uniBadge = el('span', { className: `student-uni-badge student-uni-badge--${uniLower}` }, user.university);

    info.append(name, headline, uniBadge);
    header.append(avatar, info);

    const metaLine = el('div', { className: 'student-meta-line' },
      `คณะ: ${user.faculty || 'วิศวกรรมศาสตร์'} • สาขา: ${user.major || 'วิศวกรรมซอฟต์แวร์'}`
    );

    const bio = el('div', { className: 'student-bio' },
      user.bio || 'กำลังมองหาเพื่อนร่วมทำโปรเจกต์วิศวกรรมและวิจัย'
    );

    const topSection = el('div', {}, header, metaLine, bio);
    card.append(topSection);

    if (user.raw) {
      card.append(renderActionButton(user.raw));
    } else if (user.actionType === 'accept') {
      const btnGroup = el('div', { className: 'student-card-footer' },
        el('button', { className: 'btn-accept-request' }, '✓ ยอมรับคำขอ'),
        el('button', { className: 'btn-reject-icon' }, '✕'),
      );
      card.append(btnGroup);
    } else {
      const addBtn = el('button', { className: 'btn-add-friend' }, '+ เพิ่มเพื่อน');
      const footer = el('div', { className: 'student-card-footer' }, addBtn);
      card.append(footer);
    }

    return card;
  }

  async function loadUsers() {
    cardsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#8c827a;">กำลังโหลดรายชื่อเพื่อนนักศึกษา...</div>';
    try {
      const users = await searchFriends('', currentUni);
      cardsGrid.innerHTML = '';
      if (users && users.length > 0) {
        users.forEach((u) => {
          const card = renderStudentCard({
            name: u.name,
            university: u.university,
            headline: 'นักศึกษา 3 พระจอมฯ',
            faculty: u.faculty ?? 'ยังไม่ระบุ',
            major: u.department ?? 'ยังไม่ระบุ',
            bio: 'สนใจร่วมงานและทำโปรเจกต์ กดเพิ่มเพื่อนมาคุยกันได้ครับ!',
            initial: u.name.charAt(0).toUpperCase(),
            raw: u,
          });
          cardsGrid.appendChild(card);
        });
      } else {
        // Render sample mock cards in Thai (matching Image 3)
        const sampleCards = [
          {
            name: 'Supinya P. (สุพิญญา)',
            headline: 'วิศวกรรมซอฟต์แวร์',
            university: 'KMITL',
            faculty: 'วิศวกรรมศาสตร์',
            major: 'วิศวกรรมซอฟต์แวร์',
            bio: 'กำลังหาเพื่อนร่วมทีมทำโปรเจกต์ Full-stack IoT ถนัด React, TypeScript และ Node.js...',
            initial: 'S',
            actionType: 'add' as const,
          },
          {
            name: 'Nattawut K. (ณัฐวุฒิ)',
            headline: 'หุ่นยนต์และปัญญาประดิษฐ์ (AI)',
            university: 'KMUTT',
            faculty: 'วิศวกรรมศาสตร์',
            major: 'หุ่นยนต์และระบบอัตโนมัติ',
            bio: 'สนใจด้าน Autonomous Systems, ROS และ Computer Vision ยินดีทำความรู้จักทุกคนครับ!',
            initial: 'N',
            actionType: 'accept' as const,
          },
          {
            name: 'Chaiwat S. (ชัยวัฒน์)',
            headline: 'วิศวกรรมไฟฟ้า',
            university: 'KMUTNB',
            faculty: 'วิศวกรรมศาสตร์',
            major: 'ไฟฟ้ากำลังและพลังงาน',
            bio: 'ทำงานวิจัยด้าน Power Electronics และพลังงานหมุนเวียน เปิดรับเพื่อนร่วมแลกเปลี่ยนความรู้...',
            initial: 'C',
            actionType: 'add' as const,
          },
        ];

        // Filter sample cards by university if selected
        const filtered = currentUni === 'All' ? sampleCards : sampleCards.filter((c) => c.university === currentUni);
        filtered.forEach((item) => {
          cardsGrid.appendChild(renderStudentCard(item));
        });
      }
    } catch {
      cardsGrid.innerHTML = '';
      // Fallback to sample cards
      const sampleCards = [
        {
          name: 'Supinya P. (สุพิญญา)',
          headline: 'วิศวกรรมซอฟต์แวร์',
          university: 'KMITL',
          faculty: 'วิศวกรรมศาสตร์',
          major: 'วิศวกรรมซอฟต์แวร์',
          bio: 'กำลังหาเพื่อนร่วมทีมทำโปรเจกต์ Full-stack IoT ถนัด React, TypeScript และ Node.js...',
          initial: 'S',
          actionType: 'add' as const,
        },
        {
          name: 'Nattawut K. (ณัฐวุฒิ)',
          headline: 'หุ่นยนต์และปัญญาประดิษฐ์ (AI)',
          university: 'KMUTT',
          faculty: 'วิศวกรรมศาสตร์',
          major: 'หุ่นยนต์และระบบอัตโนมัติ',
          bio: 'สนใจด้าน Autonomous Systems, ROS และ Computer Vision ยินดีทำความรู้จักทุกคนครับ!',
          initial: 'N',
          actionType: 'accept' as const,
        },
        {
          name: 'Chaiwat S. (ชัยวัฒน์)',
          headline: 'วิศวกรรมไฟฟ้า',
          university: 'KMUTNB',
          faculty: 'วิศวกรรมศาสตร์',
          major: 'ไฟฟ้ากำลังและพลังงาน',
          bio: 'ทำงานวิจัยด้าน Power Electronics และพลังงานหมุนเวียน เปิดรับเพื่อนร่วมแลกเปลี่ยนความรู้...',
          initial: 'C',
          actionType: 'add' as const,
        },
      ];
      sampleCards.forEach((item) => cardsGrid.appendChild(renderStudentCard(item)));
    }
  }

  container.append(topBar, subtabs, cardsGrid);
  void loadUsers();

  return container;
}
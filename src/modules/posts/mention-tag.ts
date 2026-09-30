import { el } from '../../core/ui/dom';
import { listFriends } from '../friends/friends-api';

export interface StudentTagItem {
  id: string;
  name: string;
  studentId: string;
  university: string;
  faculty?: string;
  department?: string;
  avatarLetter: string;
}

export interface FeelingItem {
  emoji: string;
  label: string;
}

export const FEELING_OPTIONS: FeelingItem[] = [
  { emoji: '😊', label: 'มีความสุข' },
  { emoji: '🚀', label: 'ตื่นเต้น' },
  { emoji: '📚', label: 'กำลังอ่านหนังสือ' },
  { emoji: '💻', label: 'กำลังปั่นโปรเจกต์' },
  { emoji: '💡', label: 'ได้แรงบันดาลใจ' },
  { emoji: '☕', label: 'กำลังผ่อนคลาย' },
  { emoji: '🔥', label: 'มีไฟมาก' },
  { emoji: '🎉', label: 'กำลังฉลอง' },
  { emoji: '🍔', label: 'กำลังหาของกิน' },
  { emoji: '😴', label: 'เหนื่อยล้า' },
];

export async function getAllStudents(): Promise<StudentTagItem[]> {
  try {
    const friends = await listFriends();
    return friends.map((friend) => ({
      id: friend.id,
      name: friend.name,
      studentId: '',
      university: friend.university,
      ...(friend.faculty ? { faculty: friend.faculty } : {}),
      ...(friend.department ? { department: friend.department } : {}),
      avatarLetter: friend.name.charAt(0).toUpperCase(),
    }));
  } catch {
    return [];
  }
}

export function filterStudents(students: StudentTagItem[], query: string): StudentTagItem[] {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return students.slice(0, 6);
  return students.filter((s) => {
    const matchName = s.name.toLowerCase().includes(cleanQ);
    const matchStudentId = s.studentId.includes(cleanQ);
    const matchUni = s.university.toLowerCase().includes(cleanQ);
    return matchName || matchStudentId || matchUni;
  }).slice(0, 6);
}

export interface MentionPopoverState {
  element: HTMLElement;
  open: (query: string, onSelect: (student: StudentTagItem) => void) => void;
  close: () => void;
  isOpen: () => boolean;
}

export function createMentionPopover(anchor: HTMLElement): MentionPopoverState {
  const popover = el('div', {
    className: 'mention-autocomplete-popover',
    attrs: { style: 'display: none;' },
  });

  const header = el('div', { className: 'mention-popover-header' });
  const title = el('span', { text: 'แท็กเพื่อน (ค้นหาด้วยชื่อ)' });
  header.append(title);

  const listWrap = el('div', { className: 'mention-popover-list' });
  popover.append(header, listWrap);
  anchor.style.position = 'relative';
  anchor.append(popover);

  let isCurrentlyOpen = false;

  const close = () => {
    popover.style.display = 'none';
    isCurrentlyOpen = false;
  };

  const open = async (query: string, onSelect: (student: StudentTagItem) => void) => {
    isCurrentlyOpen = true;
    popover.style.display = 'block';
    listWrap.innerHTML = '<div class="mention-loading">กำลังค้นหารายชื่อ...</div>';

    const allStudents = await getAllStudents();
    const matched = filterStudents(allStudents, query);

    listWrap.innerHTML = '';
    if (matched.length === 0) {
      const empty = el('div', {
        className: 'mention-empty',
        text: `ไม่พบรายชื่อเพื่อนที่ตรงกับ "${query}"`,
      });
      listWrap.append(empty);
      return;
    }

    matched.forEach((student) => {
      const item = el('div', { className: 'mention-item' });

      // Avatar
      const avatar = el('div', {
        className: 'mention-item-avatar',
        text: student.avatarLetter,
      });

      // Info Block: Name & Student ID
      const info = el('div', { className: 'mention-item-info' });
      const topRow = el('div', { className: 'mention-item-top' });
      const nameEl = el('span', { className: 'mention-item-name', text: student.name });

      // Badge for University
      let badgeClass = 'badge-tag--tech-uni';
      if (student.university.includes('KMITL') || student.university.includes('สจล')) badgeClass = 'badge-tag--kmitl';
      else if (student.university.includes('KMUTT') || student.university.includes('มจธ')) badgeClass = 'badge-tag--kmutt';
      else if (student.university.includes('KMUTNB') || student.university.includes('มจพ')) badgeClass = 'badge-tag--kmutnb';

      const uniBadge = el('span', {
        className: `badge-tag ${badgeClass} mention-item-badge`,
        text: student.university,
      });

      topRow.append(nameEl, uniBadge);

      const subRow = el('div', { className: 'mention-item-sub' });
      const idEl = el('span', {
        className: 'mention-item-id',
        text: student.department || student.faculty || student.university,
      });
      subRow.append(idEl);

      info.append(topRow, subRow);
      item.append(avatar, info);

      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(student);
        close();
      });

      listWrap.append(item);
    });
  };

  return {
    element: popover,
    open,
    close,
    isOpen: () => isCurrentlyOpen,
  };
}

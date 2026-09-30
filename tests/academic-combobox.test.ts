// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAcademicCombobox } from '../src/modules/profile/academic-combobox';
import {
  ACADEMIC_CATALOG,
  searchDepartments,
  searchFaculties,
} from '../src/modules/profile/academic-data';
import { completeProfilePage } from '../src/modules/auth/complete-profile-page';
import { authStore } from '../src/core/auth/auth-store';
import type { RouteContext } from '../src/core/router/router';
import type { User } from '../src/types/api';

describe('academic-data catalog and search', () => {
  it('contains faculties for all three King Mongkut universities', () => {
    const kmutt = ACADEMIC_CATALOG.filter((c) => c.university === 'KMUTT');
    const kmitl = ACADEMIC_CATALOG.filter((c) => c.university === 'KMITL');
    const kmutnb = ACADEMIC_CATALOG.filter((c) => c.university === 'KMUTNB');

    expect(kmutt.length).toBeGreaterThan(0);
    expect(kmitl.length).toBeGreaterThan(0);
    expect(kmutnb.length).toBeGreaterThan(0);
  });

  it('searches faculties by partial Thai name, English keywords and aliases', () => {
    const results = searchFaculties('วิศวะ');
    expect(results.some((r) => r.value.includes('วิศวกรรม'))).toBe(true);

    const itResults = searchFaculties('IT');
    expect(itResults.some((r) => r.value.includes('สารสนเทศ'))).toBe(true);

    const sciResults = searchFaculties('science');
    expect(sciResults.some((r) => r.value.includes('วิทยาศาสตร์'))).toBe(true);
  });

  it('prioritizes user university faculties when userUniversity is provided', () => {
    const kmuttFaculties = searchFaculties('', 'KMUTT');
    expect(kmuttFaculties[0]?.badge).toContain('KMUTT');

    const kmitlFaculties = searchFaculties('', 'KMITL');
    expect(kmitlFaculties[0]?.badge).toContain('KMITL');

    const kmutnbFaculties = searchFaculties('', 'KMUTNB');
    expect(kmutnbFaculties[0]?.badge).toContain('KMUTNB');
  });

  it('provides a custom option when search query does not match any existing faculty', () => {
    const customQuery = 'คณะการบินอวกาศขั้นสูงแห่งอนาคต';
    const results = searchFaculties(customQuery);
    const customOption = results.find((r) => r.isCustom);

    expect(customOption).toBeDefined();
    expect(customOption?.value).toBe(customQuery);
    expect(customOption?.label).toContain(customQuery);
  });

  it('filters departments based on selected faculty', () => {
    const engDepts = searchDepartments('', 'คณะวิศวกรรมศาสตร์', 'KMUTT');
    expect(engDepts.some((d) => d.value.includes('คอมพิวเตอร์'))).toBe(true);
    expect(engDepts.some((d) => d.value.includes('ไฟฟ้า'))).toBe(true);

    const sitDepts = searchDepartments('', 'คณะเทคโนโลยีสารสนเทศ (SIT)', 'KMUTT');
    expect(sitDepts.some((d) => d.value.includes('นวัตกรรมบริการดิจิทัล'))).toBe(true);
  });

  it('provides a custom option when department query does not match', () => {
    const customDept = 'สาขาพัฒนาเกมและปัญญาประดิษฐ์สร้างสรรค์';
    const results = searchDepartments(customDept, 'คณะวิศวกรรมศาสตร์');
    const customOption = results.find((r) => r.isCustom);

    expect(customOption).toBeDefined();
    expect(customOption?.value).toBe(customDept);
    expect(customOption?.label).toContain(customDept);
  });
});

describe('createAcademicCombobox component', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('renders input, toggle button and popover list', () => {
    const onSelect = vi.fn();
    const combobox = createAcademicCombobox({
      id: 'test-combobox',
      name: 'test-combobox',
      placeholder: 'ค้นหาคณะ',
      getSuggestions: (q) => searchFaculties(q),
      onSelect,
    });

    document.body.append(combobox.container);
    expect(combobox.input.id).toBe('test-combobox');
    expect(combobox.input.getAttribute('role')).toBe('combobox');

    const popover = combobox.container.querySelector('.academic-combobox__popover') as HTMLElement;
    expect(popover.style.display).toBe('none');

    // Focus opens popover
    combobox.input.focus();
    expect(popover.style.display).toBe('block');
    expect(popover.querySelectorAll('.academic-combobox__item').length).toBeGreaterThan(0);
  });

  it('selects option on click and triggers onSelect callback', () => {
    const onSelect = vi.fn();
    const combobox = createAcademicCombobox({
      id: 'test-combobox',
      name: 'test-combobox',
      getSuggestions: (q) => searchFaculties(q, 'KMUTT'),
      onSelect,
    });
    document.body.append(combobox.container);

    combobox.input.focus();
    const popover = combobox.container.querySelector('.academic-combobox__popover') as HTMLElement;
    const firstOption = popover.querySelector('.academic-combobox__item') as HTMLElement;

    firstOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(onSelect).toHaveBeenCalled();
    expect(combobox.input.value).toBeTruthy();
    expect(popover.style.display).toBe('none');
  });

  it('allows custom input by typing and selecting custom option or leaving typed value', () => {
    const onSelect = vi.fn();
    const combobox = createAcademicCombobox({
      id: 'custom-combobox',
      name: 'custom-combobox',
      getSuggestions: (q) => searchFaculties(q),
      onSelect,
    });
    document.body.append(combobox.container);

    combobox.input.value = 'คณะนวัตกรรมดิจิทัลแห่งอนาคต';
    combobox.input.dispatchEvent(new Event('input', { bubbles: true }));

    const popover = combobox.container.querySelector('.academic-combobox__popover') as HTMLElement;
    const customItem = popover.querySelector('.academic-combobox__item--custom') as HTMLElement;
    expect(customItem).not.toBeNull();
    expect(customItem.textContent).toContain('คณะนวัตกรรมดิจิทัลแห่งอนาคต');

    customItem.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(combobox.input.value).toBe('คณะนวัตกรรมดิจิทัลแห่งอนาคต');
    expect(onSelect).toHaveBeenCalledWith('คณะนวัตกรรมดิจิทัลแห่งอนาคต');
  });

  it('navigates with keyboard ArrowDown and selects with Enter', () => {
    const onSelect = vi.fn();
    const combobox = createAcademicCombobox({
      id: 'keyboard-combobox',
      name: 'keyboard-combobox',
      getSuggestions: (q) => searchFaculties(q, 'KMUTT'),
      onSelect,
    });
    document.body.append(combobox.container);

    combobox.input.focus();
    combobox.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    const popover = combobox.container.querySelector('.academic-combobox__popover') as HTMLElement;
    const activeItem = popover.querySelector('.academic-combobox__item.is-active') as HTMLElement;
    expect(activeItem).not.toBeNull();

    combobox.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelect).toHaveBeenCalled();
    expect(popover.style.display).toBe('none');
  });

  it('clears value when clear button is clicked', () => {
    const onSelect = vi.fn();
    const combobox = createAcademicCombobox({
      id: 'clear-combobox',
      name: 'clear-combobox',
      initialValue: 'คณะวิศวกรรมศาสตร์',
      getSuggestions: (q) => searchFaculties(q),
      onSelect,
    });
    document.body.append(combobox.container);

    const clearBtn = combobox.container.querySelector('.academic-combobox__clear') as HTMLButtonElement;
    expect(clearBtn.style.display).toBe('flex');

    clearBtn.click();
    expect(combobox.input.value).toBe('');
    expect(onSelect).toHaveBeenCalledWith('');
  });
});

describe('completeProfilePage with academic combobox', () => {
  const dummyUser: User = {
    _id: 'test-user-id',
    name: 'Test Student',
    email: 'test@mail.kmutt.ac.th',
    role: 'user',
    university: 'KMUTT',
    needsProfileCompletion: true,
    createdAt: '',
    updatedAt: '',
  };

  beforeEach(() => {
    authStore.setAuthenticated({ ...dummyUser }, 'dummy-token');
    document.body.replaceChildren();
  });

  it('renders searchable comboboxes for faculty and department with helper hints', () => {
    const context: RouteContext = {
      url: new URL('http://localhost:3000/complete-profile'),
      params: {},
      query: new URLSearchParams(),
    };
    const page = completeProfilePage(context);
    document.body.replaceChildren(page.element);

    const facultyInput = page.element.querySelector<HTMLInputElement>('#faculty');
    const departmentInput = page.element.querySelector<HTMLInputElement>('#department');

    expect(facultyInput).not.toBeNull();
    expect(departmentInput).not.toBeNull();
    expect(page.element.textContent).toContain('คณะ');
    expect(page.element.textContent).toContain('ภาควิชา / สาขาวิชา');
    expect(page.element.textContent).toContain('พิมพ์ค้นหาหรือเลือกจากรายการทั้งหมด หากไม่มีสามารถพิมพ์ระบุเองได้');
  });

  it('updating faculty refreshes department suggestions with departments of that faculty', () => {
    const context: RouteContext = {
      url: new URL('http://localhost:3000/complete-profile'),
      params: {},
      query: new URLSearchParams(),
    };
    const page = completeProfilePage(context);
    document.body.replaceChildren(page.element);

    const facultyInput = page.element.querySelector<HTMLInputElement>('#faculty')!;
    const departmentInput = page.element.querySelector<HTMLInputElement>('#department')!;

    facultyInput.focus();
    facultyInput.value = 'คณะเทคโนโลยีสารสนเทศ (SIT)';
    facultyInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Focus department input to view suggestions for SIT
    departmentInput.focus();
    const deptPopover = departmentInput.closest('.academic-combobox')!.querySelector('.academic-combobox__popover')!;
    expect(deptPopover.textContent).toContain('วิทยาการคอมพิวเตอร์');
    expect(deptPopover.textContent).toContain('นวัตกรรมบริการดิจิทัล');
  });
});

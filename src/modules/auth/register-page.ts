import { authApi } from '../../core/auth/auth-api';
import type { PageView } from '../../core/router/router';
import { el } from '../../core/ui/dom';
import { errorMessage } from '../../core/ui/error-message';
import { toast } from '../../core/ui/toast';
import { registerFormSchema, type University } from '../../validation/schemas';
import { clearFieldErrors, field, showZodErrors } from '../shared/form';

const clusterIconSvg = `
<svg width="54" height="54" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Center circle -->
  <circle cx="30" cy="30" r="5.5" fill="#a83800"/>
  <!-- 5 Nodes around -->
  <circle cx="30" cy="10" r="4.5" fill="#a83800"/>
  <circle cx="48" cy="22" r="4.5" fill="#a83800"/>
  <circle cx="41" cy="46" r="4.5" fill="#a83800"/>
  <circle cx="19" cy="46" r="4.5" fill="#a83800"/>
  <circle cx="12" cy="22" r="4.5" fill="#a83800"/>
  <!-- Connecting Lines -->
  <line x1="30" y1="30" x2="30" y2="10" stroke="#a83800" stroke-width="2.5"/>
  <line x1="30" y1="30" x2="48" y2="22" stroke="#a83800" stroke-width="2.5"/>
  <line x1="30" y1="30" x2="41" y2="46" stroke="#a83800" stroke-width="2.5"/>
  <line x1="30" y1="30" x2="19" y2="46" stroke="#a83800" stroke-width="2.5"/>
  <line x1="30" y1="30" x2="12" y2="22" stroke="#a83800" stroke-width="2.5"/>
</svg>
`;

export function registerPage(): PageView {
  const container = el('div', { className: 'auth-landing-page' });

  // 1. Hero Section
  const hero = el('div', { className: 'auth-landing-hero' });
  const iconWrap = el('div', { className: 'auth-network-icon' });
  iconWrap.innerHTML = clusterIconSvg;
  const title = el('h1', { className: 'auth-site-title', text: 'King’s society' });
  const description = el('p', {
    className: 'auth-site-description',
    text: 'เครือข่ายสังคมออนไลน์สำหรับนักศึกษา สจล. (KMITL), มจธ. (KMUTT) และ มจพ. (KMUTNB) เชื่อมโยง แลกเปลี่ยนความรู้ และร่วมสร้างสรรค์อนาคตไปด้วยกัน',
  });
  hero.append(iconWrap, title, description);

  // 2. Card Section
  const card = el('div', { className: 'auth-sso-card' });
  const cardTitle = el('h2', {
    className: 'auth-card-title',
    text: 'สร้างบัญชีผู้ใช้ใหม่',
  });
  const cardSubtitle = el('p', {
    className: 'auth-card-subtitle',
    text: 'เลือกมหาวิทยาลัยของคุณเพื่อเริ่มต้นใช้งาน King’s society',
  });

  // Uni Buttons
  const buttonsGroup = el('div', { className: 'auth-uni-buttons' });

  const createUniButton = (name: string, uniClass: string): HTMLButtonElement => {
    const btn = el('button', {
      className: `btn-uni-sso btn-uni-sso--${uniClass}`,
      attrs: { type: 'button' },
    });
    const label = el('span', { text: `สมัครสมาชิกด้วยบัญชี ${name}` });
    btn.append(label);
    return btn;
  };

  const btnKmitl = createUniButton('KMITL (สจล.)', 'kmitl');
  const btnKmutt = createUniButton('KMUTT (มจธ.)', 'kmutt');
  const btnKmutnb = createUniButton('KMUTNB (มจพ.)', 'kmutnb');
  const allUniButtons = [btnKmitl, btnKmutt, btnKmutnb];

  let currentDomain = '@kmitl.ac.th';
  let selectedUni: University = 'KMITL';
  let selectedUniName = '';

  const eyeIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOffIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  const selectUniversity = (selectedBtn: HTMLButtonElement, uni: University, name: string, domain: string): void => {
    currentDomain = domain;
    selectedUni = uni;
    selectedUniName = name;
    domainSuffix.textContent = domain;

    allUniButtons.forEach((btn) => {
      btn.style.display = btn === selectedBtn ? 'flex' : 'none';
    });
    changeUniBtn.style.display = 'inline-block';
    ssoBadge.style.display = 'none';
    credentialsToggleWrap.style.display = 'block';

    nameInput.value = '';
    emailInput.value = '';
    passwordInput.value = '';
    passwordInput.type = 'password';
    togglePasswordBtn.innerHTML = eyeIcon;
    togglePasswordBtn.setAttribute('aria-label', 'แสดงรหัสผ่าน');
    togglePasswordBtn.setAttribute('title', 'แสดงรหัสผ่าน');
    confirmPasswordInput.value = '';
    confirmPasswordInput.type = 'password';
    toggleConfirmPasswordBtn.innerHTML = eyeIcon;
    toggleConfirmPasswordBtn.setAttribute('aria-label', 'แสดงรหัสผ่าน');
    toggleConfirmPasswordBtn.setAttribute('title', 'แสดงรหัสผ่าน');
    passwordMatchMsg.style.display = 'none';
    passwordMatchMsg.textContent = '';
    formError.textContent = '';

    submit.textContent = `สร้างบัญชีผู้ใช้ ${name}`;
    if (domain.includes('kmitl')) {
      submit.style.backgroundColor = 'var(--kmitl-color)';
    } else if (domain.includes('kmutt')) {
      submit.style.backgroundColor = 'var(--kmutt-color)';
    } else if (domain.includes('kmutnb')) {
      submit.style.backgroundColor = 'var(--kmutnb-color)';
    }
    updateFacultyDropdown(uni);
    submit.style.color = '#ffffff';

    nameInput.focus();
  };

  const resetSelection = (): void => {
    allUniButtons.forEach((btn) => {
      btn.style.display = 'flex';
    });
    changeUniBtn.style.display = 'none';
    ssoBadge.style.display = 'inline-flex';
    credentialsToggleWrap.style.display = 'none';
    updateFacultyDropdown('KMITL');
    nameInput.value = '';
    emailInput.value = '';
    passwordInput.value = '';
    passwordInput.type = 'password';
    togglePasswordBtn.innerHTML = eyeIcon;
    togglePasswordBtn.setAttribute('aria-label', 'แสดงรหัสผ่าน');
    togglePasswordBtn.setAttribute('title', 'แสดงรหัสผ่าน');
    confirmPasswordInput.value = '';
    confirmPasswordInput.type = 'password';
    toggleConfirmPasswordBtn.innerHTML = eyeIcon;
    toggleConfirmPasswordBtn.setAttribute('aria-label', 'แสดงรหัสผ่าน');
    toggleConfirmPasswordBtn.setAttribute('title', 'แสดงรหัสผ่าน');
    passwordMatchMsg.style.display = 'none';
    passwordMatchMsg.textContent = '';
    submit.style.backgroundColor = '';
    formError.textContent = '';
  };

  btnKmitl.addEventListener('click', () => selectUniversity(btnKmitl, 'KMITL', 'KMITL (สจล.)', '@kmitl.ac.th'));
  btnKmutt.addEventListener('click', () => selectUniversity(btnKmutt, 'KMUTT', 'KMUTT (มจธ.)', '@kmutt.ac.th'));
  btnKmutnb.addEventListener('click', () => selectUniversity(btnKmutnb, 'KMUTNB', 'KMUTNB (มจพ.)', '@kmutnb.ac.th'));

  const changeUniBtn = el('button', {
    className: 'button button--ghost button--small',
    attrs: { type: 'button', style: 'display: none; margin: 6px auto 0; color: var(--brand-rust); font-weight: 700;' },
    text: '← เปลี่ยนสถาบัน',
  });
  changeUniBtn.addEventListener('click', resetSelection);

  buttonsGroup.append(btnKmitl, btnKmutt, btnKmutnb, changeUniBtn);

  const ssoBadge = el('div', { className: 'auth-sso-badge' });
  ssoBadge.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>เข้าสู่ระบบผ่าน SSO ปลอดภัย</span>`;

  // Expandable Credentials Form for registration (hidden by default)
  const credentialsToggleWrap = el('div', {
    className: 'auth-credentials-toggle',
    attrs: { style: 'display: none;' },
  });

  const form = el('form', {
    className: 'form',
    attrs: { novalidate: 'true', style: 'text-align: left;' },
  });

  const nameInput = el('input', {
    className: 'input',
    attrs: {
      id: 'name',
      name: 'name',
      type: 'text',
      autocomplete: 'name',
      maxlength: '80',
      placeholder: 'เช่น สมชาย วิศวกรรม',
      required: 'true',
    },
  });

  const emailInput = el('input', {
    className: 'input-domain-field',
    attrs: {
      id: 'email',
      name: 'email',
      type: 'text',
      placeholder: 'เช่น 65010001 หรือชื่อผู้ใช้',
      required: 'true',
      autocomplete: 'username',
    },
  });

  // Strip @ if user types or pastes it
  emailInput.addEventListener('input', () => {
    if (emailInput.value.includes('@')) {
      emailInput.value = emailInput.value.replace(/@.*/g, '');
    }
  });

  const domainSuffix = el('span', {
    className: 'input-domain-suffix',
    text: '@kmitl.ac.th',
    attrs: { title: 'นามสกุลอีเมลสถาบัน' },
  });
  domainSuffix.addEventListener('click', () => {
    emailInput.focus();
  });

  const emailWrap = el('div', { className: 'input-domain-wrap' });
  emailWrap.append(emailInput, domainSuffix);

  const passwordInput = el('input', {
    className: 'input',
    attrs: {
      id: 'password',
      name: 'password',
      type: 'password',
      autocomplete: 'new-password',
      maxlength: '128',
      placeholder: '••••••••',
      required: 'true',
    },
  });

  const togglePasswordBtn = el('button', {
    className: 'btn-toggle-password',
    attrs: {
      type: 'button',
      'aria-label': 'แสดงรหัสผ่าน',
      title: 'แสดงรหัสผ่าน',
    },
  });
  togglePasswordBtn.innerHTML = eyeIcon;

  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePasswordBtn.innerHTML = isPassword ? eyeOffIcon : eyeIcon;
    const label = isPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน';
    togglePasswordBtn.setAttribute('aria-label', label);
    togglePasswordBtn.setAttribute('title', label);
    passwordInput.focus();
  });

  const passwordWrap = el('div', { className: 'input-password-wrap' });
  passwordWrap.append(passwordInput, togglePasswordBtn);

  const confirmPasswordInput = el('input', {
    className: 'input',
    attrs: {
      id: 'confirmPassword',
      name: 'confirmPassword',
      type: 'password',
      autocomplete: 'new-password',
      maxlength: '128',
      placeholder: '••••••••',
      required: 'true',
    },
  });

  const toggleConfirmPasswordBtn = el('button', {
    className: 'btn-toggle-password',
    attrs: {
      type: 'button',
      'aria-label': 'แสดงรหัสผ่าน',
      title: 'แสดงรหัสผ่าน',
    },
  });
  toggleConfirmPasswordBtn.innerHTML = eyeIcon;

  toggleConfirmPasswordBtn.addEventListener('click', () => {
    const isPassword = confirmPasswordInput.type === 'password';
    confirmPasswordInput.type = isPassword ? 'text' : 'password';
    toggleConfirmPasswordBtn.innerHTML = isPassword ? eyeOffIcon : eyeIcon;
    const label = isPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน';
    toggleConfirmPasswordBtn.setAttribute('aria-label', label);
    toggleConfirmPasswordBtn.setAttribute('title', label);
    confirmPasswordInput.focus();
  });

  const confirmPasswordWrap = el('div', { className: 'input-password-wrap' });
  confirmPasswordWrap.append(confirmPasswordInput, toggleConfirmPasswordBtn);

  const passwordMatchMsg = el('p', {
    className: 'field__match-status',
    attrs: { id: 'confirmPassword-match', 'aria-live': 'polite', style: 'display: none;' },
  });

  const checkPasswordMatch = (): void => {
    const pwd = passwordInput.value;
    const cpwd = confirmPasswordInput.value;
    const errorEl = form.querySelector<HTMLElement>('#confirmPassword-error');

    if (!cpwd) {
      passwordMatchMsg.style.display = 'none';
      passwordMatchMsg.textContent = '';
      passwordMatchMsg.className = 'field__match-status';
      confirmPasswordInput.removeAttribute('aria-invalid');
      return;
    }

    if (pwd === cpwd) {
      passwordMatchMsg.style.display = 'block';
      passwordMatchMsg.className = 'field__match-status field__match-status--success';
      passwordMatchMsg.textContent = '✓ รหัสผ่านตรงกัน';
      confirmPasswordInput.removeAttribute('aria-invalid');
      if (errorEl) errorEl.textContent = '';
    } else {
      passwordMatchMsg.style.display = 'block';
      passwordMatchMsg.className = 'field__match-status field__match-status--error';
      passwordMatchMsg.textContent = '✕ รหัสผ่านไม่ตรงกัน';
      confirmPasswordInput.setAttribute('aria-invalid', 'true');
      if (errorEl) errorEl.textContent = '';
    }
  };

  confirmPasswordInput.addEventListener('input', checkPasswordMatch);
  passwordInput.addEventListener('input', () => {
    if (confirmPasswordInput.value) {
      checkPasswordMatch();
    }
  });

  const MOCK_FACULTIES_AND_DEPARTMENTS: Record<University, Record<string, string[]>> = {
    KMITL: {
      'คณะวิศวกรรมศาสตร์': [
        'ภาควิชาวิศวกรรมคอมพิวเตอร์',
        'ภาควิชาวิศวกรรมหุ่นยนต์และปัญญาประดิษฐ์ (AI)',
        'ภาควิชาวิศวกรรมไฟฟ้า',
        'ภาควิชาวิศวกรรมเครื่องกล',
        'ภาควิชาวิศวกรรมโยธา',
        'ภาควิชาวิศวกรรมโทรคมนาคม',
        'ภาควิชาวิศวกรรมเคมี',
        'ภาควิชาวิศวกรรมอุตสาหการ',
        'ภาควิชาวิศวกรรมชีวการแพทย์',
      ],
      'คณะเทคโนโลยีสารสนเทศ': [
        'สาขาวิชาเทคโนโลยีสารสนเทศ',
        'สาขาวิชาวิทยาการข้อมูลและการวิเคราะห์เชิงธุรกิจ (Data Science)',
        'สาขาวิชาความมั่นคงปลอดภัยไซเบอร์ (Cybersecurity)',
        'สาขาวิชาการพัฒนาซอฟต์แวร์และนวัตกรรมดิจิทัล',
        'สาขาวิชาปัญญาประดิษฐ์ประยุกต์',
      ],
      'คณะวิทยาศาสตร์': [
        'ภาควิชาวิทยาการคอมพิวเตอร์',
        'ภาควิชาคณิตศาสตร์ประยุกต์',
        'ภาควิชาสถิติประยุกต์และวิทยาการข้อมูล',
        'ภาควิชาฟิสิกส์ประยุกต์',
        'ภาควิชาเคมีอุตสาหกรรม',
        'ภาควิชาเทคโนโลยีชีวภาพ',
      ],
      'คณะสถาปัตยกรรม ศิลปะและการออกแบบ': [
        'สาขาสถาปัตยกรรมหลัก',
        'สาขาการออกแบบภายใน',
        'สาขานิเทศศิลป์ / มีเดียอาร์ต',
        'สาขาการออกแบบอุตสาหกรรม',
      ],
      'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี': [
        'ภาควิชาครุศาสตร์วิศวกรรมคอมพิวเตอร์',
        'ภาควิชาครุศาสตร์วิศวกรรมไฟฟ้า',
        'ภาควิชาครุศาสตร์วิศวกรรมเครื่องกล',
        'ภาควิชาเทคโนโลยีและสื่อสารการศึกษา',
      ],
      'คณะเทคโนโลยีการเกษตร': [
        'สาขาวิชาพืชศาสตร์และเทคโนโลยีการเกษตร',
        'สาขาวิชาสัตวศาสตร์และสัตว์น้ำ',
        'สาขาวิชาการจัดการฟาร์มและนวัตกรรมเกษตร',
      ],
      'คณะอุตสาหกรรมอาหาร': [
        'สาขาวิทยาศาสตร์และเทคโนโลยีการอาหาร',
        'สาขาวิศวกรรมแปรรูปอาหาร',
      ],
      'วิทยาลัยอุตสาหกรรมการบินนานาชาติ': [
        'สาขาวิศวกรรมการบินและอวกาศ',
        'สาขาการจัดการโลจิสติกส์การบิน',
      ],
      'อื่นๆ / ยังไม่สังกัด': [
        'ทั่วไป / อื่นๆ',
      ],
    },
    KMUTT: {
      'คณะวิศวกรรมศาสตร์': [
        'ภาควิชาวิศวกรรมคอมพิวเตอร์',
        'ภาควิชาวิศวกรรมไฟฟ้า',
        'ภาควิชาวิศวกรรมเครื่องกล',
        'ภาควิชาวิศวกรรมโยธา',
        'ภาควิชาวิศวกรรมเคมี',
        'ภาควิชาวิศวกรรมสิ่งแวดล้อม',
        'ภาควิชาวิศวกรรมอุตสาหการ',
        'ภาควิชาวิศวกรรมระบบควบคุมและเครื่องมือวัด',
      ],
      'คณะเทคโนโลยีสารสนเทศ': [
        'สาขาวิชาเทคโนโลยีสารสนเทศ (IT)',
        'สาขาวิชาวิทยาการคอมพิวเตอร์ (CS - หลักสูตรภาษาอังกฤษ)',
        'สาขาวิชานวัตกรรมบริการดิจิทัล (DSI)',
      ],
      'คณะวิทยาศาสตร์': [
        'ภาควิชาคณิตศาสตร์',
        'ภาควิชาฟิสิกส์',
        'ภาควิชาเคมี',
        'ภาควิชาจุลชีววิทยา',
      ],
      'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี': [
        'ภาควิชาครุศาสตร์ไฟฟ้า',
        'ภาควิชาครุศาสตร์โยธา',
        'ภาควิชาครุศาสตร์เครื่องกล',
        'ภาควิชาเทคโนโลยีและสื่อสารการศึกษา',
        'ภาควิชาคอมพิวเตอร์และเทคโนโลยีสารสนเทศ',
      ],
      'คณะสถาปัตยกรรมศาสตร์และการออกแบบ (SoA+D)': [
        'สาขาสถาปัตยกรรมศาสตร์ (หลักสูตรนานาชาติ)',
        'สาขาการออกแบบภายใน',
        'สาขาการออกแบบอุตสาหกรรม',
        'สาขาการออกแบบนิเทศศิลป์',
      ],
      'สถาบันวิทยาการหุ่นยนต์ภาคสนาม (FIBO)': [
        'สาขาวิชาวิศวกรรมหุ่นยนต์และระบบอัตโนมัติ',
      ],
      'อื่นๆ / ยังไม่สังกัด': [
        'ทั่วไป / อื่นๆ',
      ],
    },
    KMUTNB: {
      'คณะวิศวกรรมศาสตร์': [
        'ภาควิชาวิศวกรรมคอมพิวเตอร์',
        'ภาควิชาวิศวกรรมไฟฟ้าและคอมพิวเตอร์',
        'ภาควิชาวิศวกรรมเครื่องกลและการบิน-อวกาศ',
        'ภาควิชาวิศวกรรมการผลิต',
        'ภาควิชาวิศวกรรมเคมี',
        'ภาควิชาวิศวกรรมโยธา',
        'ภาควิชาวิศวกรรมวัสดุและกระบวนการ',
      ],
      'วิทยาลัยเทคโนโลยีอุตสาหกรรม (วทอ.)': [
        'ภาควิชาเทคโนโลยีวิศวกรรมอิเล็กทรอนิกส์',
        'ภาควิชาเทคโนโลยีวิศวกรรมเครื่องกลและยานยนต์',
        'ภาควิชาเทคโนโลยีวิศวกรรมโยธา',
        'ภาควิชาเทคโนโลยีวิศวกรรมอุตสาหการ',
        'ภาควิชาเทคโนโลยีวิศวกรรมการเชื่อม',
      ],
      'คณะเทคโนโลยีสารสนเทศและนวัตกรรมดิจิทัล': [
        'ภาควิชาเทคโนโลยีสารสนเทศ',
        'ภาควิชาการจัดการสารสนเทศและนวัตกรรมดิจิทัล',
        'ภาควิชาวิทยาการข้อมูลและการวิเคราะห์ขั้นสูง',
      ],
      'คณะวิทยาศาสตร์ประยุกต์': [
        'ภาควิชาวิทยาการคอมพิวเตอร์และสารสนเทศ',
        'ภาควิชาคณิตศาสตร์ประยุกต์',
        'ภาควิชาสถิติประยุกต์',
        'ภาควิชาฟิสิกส์อุตสาหกรรมและอุปกรณ์การแพทย์',
        'ภาควิชาเคมีอุตสาหกรรม',
      ],
      'คณะครุศาสตร์อุตสาหกรรม': [
        'ภาควิชาครุศาสตร์วิศวกรรมไฟฟ้า',
        'ภาควิชาครุศาสตร์วิศวกรรมเครื่องกล',
        'ภาควิชาครุศาสตร์วิศวกรรมโยธา',
        'ภาควิชาคอมพิวเตอร์ศึกษา',
      ],
      'คณะบริหารธุรกิจและอุตสาหกรรมบริการ': [
        'สาขาบริหารธุรกิจอุตสาหกรรมและการค้ามนุษย์',
        'สาขาการจัดการอุตสาหกรรมการท่องเที่ยวและบริการ',
      ],
      'อื่นๆ / ยังไม่สังกัด': [
        'ทั่วไป / อื่นๆ',
      ],
    },
  };

  const facultySelect = el('select', {
    className: 'input',
    attrs: {
      id: 'faculty',
      name: 'faculty',
      required: 'true',
    },
  });

  const departmentSelect = el('select', {
    className: 'input',
    attrs: {
      id: 'department',
      name: 'department',
      required: 'true',
      disabled: 'true',
    },
  });

  const updateFacultyDropdown = (uni: University): void => {
    facultySelect.innerHTML = '';
    facultySelect.append(el('option', { attrs: { value: '' }, text: '-- เลือกคณะวิชาของคุณ --' }));
    const faculties = MOCK_FACULTIES_AND_DEPARTMENTS[uni] || {};
    Object.keys(faculties).forEach((fac) => {
      facultySelect.append(el('option', { attrs: { value: fac }, text: fac }));
    });
    departmentSelect.innerHTML = '';
    departmentSelect.append(el('option', { attrs: { value: '' }, text: '-- กรุณาเลือกคณะวิชาก่อน --' }));
    departmentSelect.disabled = true;
  };

  updateFacultyDropdown('KMITL');

  facultySelect.addEventListener('change', () => {
    const selectedFac = facultySelect.value;
    departmentSelect.innerHTML = '';
    const faculties = MOCK_FACULTIES_AND_DEPARTMENTS[selectedUni] || {};
    const departments = faculties[selectedFac];
    if (!selectedFac || !departments) {
      departmentSelect.disabled = true;
      departmentSelect.append(el('option', { attrs: { value: '' }, text: '-- กรุณาเลือกคณะวิชาก่อน --' }));
    } else {
      departmentSelect.disabled = false;
      departmentSelect.append(el('option', { attrs: { value: '' }, text: '-- เลือกภาควิชาของคุณ --' }));
      departments.forEach((dept) => {
        departmentSelect.append(el('option', { attrs: { value: dept }, text: dept }));
      });
    }
  });

  const confirmField = field('confirmPassword', 'ยืนยันรหัสผ่าน', confirmPasswordWrap);
  confirmField.append(passwordMatchMsg);

  const submit = el('button', {
    className: 'button button--primary button--full btn-auth-submit',
    text: 'สร้างบัญชีผู้ใช้',
    attrs: { type: 'submit' },
  });

  const formError = el('p', {
    className: 'form-error',
    attrs: { role: 'alert' },
  });

  form.append(
    field('name', 'ชื่อ-นามสกุล', nameInput),
    field('faculty', 'คณะวิชา', facultySelect),
    field('department', 'ภาควิชา', departmentSelect),
    field('email', 'อีเมลสถาบัน', emailWrap),
    field(
      'password',
      'รหัสผ่าน',
      passwordWrap,
      'ความยาว 10 ตัวอักษรขึ้นไป ประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข',
    ),
    confirmField,
    formError,
    submit,
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    formError.textContent = '';

    const rawPrefix = emailInput.value.trim();
    const cleanPrefix = rawPrefix.includes('@') ? (rawPrefix.split('@')[0] ?? '') : rawPrefix;
    const fullEmail = cleanPrefix ? `${cleanPrefix}${currentDomain}` : '';

    const result = registerFormSchema.safeParse({
      name: nameInput.value.trim(),
      email: fullEmail,
      faculty: facultySelect.value,
      department: departmentSelect.value,
      password: passwordInput.value,
      confirmPassword: confirmPasswordInput.value,
      university: selectedUni,
    });
    if (!result.success) {
      showZodErrors(form, result.error);
      return;
    }

    submit.disabled = true;
    submit.textContent = 'กำลังสร้างบัญชี…';
    try {
      await authApi.register({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
        university: result.data.university,
        faculty: result.data.faculty,
        department: result.data.department,
      });
      toast.success('สร้างบัญชีสำเร็จ ยินดีต้อนรับสู่ครอบครัว 3 พระจอมฯ');
      window.history.pushState(null, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      formError.textContent = errorMessage(error);
      submit.disabled = false;
      submit.textContent = selectedUniName ? `สร้างบัญชีผู้ใช้ ${selectedUniName}` : 'สร้างบัญชีผู้ใช้';
    }
  });

  credentialsToggleWrap.append(form);

  const loginLinkWrap = el('p', {
    className: 'auth-register-prompt',
    attrs: {
      style: 'margin-top: 20px; margin-bottom: 0; font-size: 0.86rem; color: #736b63; text-align: center;',
    },
  });
  loginLinkWrap.append(
    document.createTextNode('มีบัญชีอยู่แล้วใช่หรือไม่? '),
    el('a', {
      className: 'text-link',
      text: 'เข้าสู่ระบบที่นี่',
      attrs: { href: '/login' },
    }),
  );

  card.append(
    cardTitle,
    cardSubtitle,
    buttonsGroup,
    ssoBadge,
    credentialsToggleWrap,
    loginLinkWrap,
  );

  // 3. Footer Section
  const footer = el('footer', { className: 'auth-landing-footer' });
  const linksWrap = el(
    'div',
    { className: 'auth-footer-links' },
    el('a', { attrs: { href: '#' }, text: 'นโยบายความเป็นส่วนตัว' }),
    el('span', { text: '•' }),
    el('a', { attrs: { href: '#' }, text: 'ข้อกำหนดการใช้งาน' }),
    el('span', { text: '•' }),
    el('a', { attrs: { href: '#' }, text: 'ติดต่อฝ่ายสนับสนุน' }),
  );
  const copyright = el('p', {
    text: '© 2024 TechEdu Connect. เครือข่ายแลกเปลี่ยน 3 สถาบันพระจอมเกล้า.',
  });
  footer.append(linksWrap, copyright);

  container.append(hero, card, footer);
  return { title: 'สมัครสมาชิก - King’s society', element: container };
}
import { authApi } from "../../core/auth/auth-api";
import type { PageView, RouteContext } from "../../core/router/router";
import { el } from "../../core/ui/dom";
import { errorMessage } from "../../core/ui/error-message";
import { toast } from "../../core/ui/toast";
import { loginSchema } from "../../validation/schemas";
import { clearFieldErrors, field, showZodErrors } from "../shared/form";

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

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

export function loginPage(context: RouteContext): PageView {
  const container = el("div", { className: "auth-landing-page" });

  // 1. Hero Section
  const hero = el("div", { className: "auth-landing-hero" });
  const iconWrap = el("div", { className: "auth-network-icon" });
  iconWrap.innerHTML = clusterIconSvg;
  const title = el("h1", {
    className: "auth-site-title",
    text: "King’s society",
  });
  const description = el("p", {
    className: "auth-site-description",
    text: "เครือข่ายสังคมออนไลน์สำหรับนักศึกษา สจล. (KMITL), มจธ. (KMUTT) และ มจพ. (KMUTNB) เชื่อมโยง แลกเปลี่ยนความรู้ และร่วมสร้างสรรค์อนาคตไปด้วยกัน",
  });
  hero.append(iconWrap, title, description);

  // 2. Card Section
  const card = el("div", { className: "auth-sso-card" });
  const cardTitle = el("h2", {
    className: "auth-card-title",
    text: "เลือกสถาบันของคุณ",
  });
  const cardSubtitle = el("p", {
    className: "auth-card-subtitle",
    text: "เข้าสู่ระบบอย่างปลอดภัยด้วยบัญชีมหาวิทยาลัยของคุณ",
  });

  // Uni Buttons
  const buttonsGroup = el("div", { className: "auth-uni-buttons" });

  const createUniButton = (
    name: string,
    uniClass: string,
  ): HTMLButtonElement => {
    const btn = el("button", {
      className: `btn-uni-sso btn-uni-sso--${uniClass}`,
      attrs: { type: "button" },
    });
    const label = el("span", { text: `เข้าสู่ระบบด้วยบัญชี ${name}` });
    btn.append(label);
    return btn;
  };

  const btnKmitl = createUniButton("KMITL (สจล.)", "kmitl");
  const btnKmutt = createUniButton("KMUTT (มจธ.)", "kmutt");
  const btnKmutnb = createUniButton("KMUTNB (มจพ.)", "kmutnb");
  const allUniButtons = [btnKmitl, btnKmutt, btnKmutnb];

  let currentDomain = "@kmitl.ac.th";
  let selectedUniName = "";

  const eyeIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOffIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  const selectUniversity = (
    selectedBtn: HTMLButtonElement,
    name: string,
    domain: string,
  ): void => {
    currentDomain = domain;
    selectedUniName = name;
    domainSuffix.textContent = domain;
    allUniButtons.forEach((btn) => {
      btn.style.display = btn === selectedBtn ? "flex" : "none";
    });
    changeUniBtn.style.display = "inline-block";
    ssoBadge.style.display = "none";
    credentialsToggleWrap.style.display = "block";
    emailInput.value = "";
    passwordInput.value = "";
    passwordInput.type = "password";
    togglePasswordBtn.innerHTML = eyeIcon;
    togglePasswordBtn.setAttribute("aria-label", "แสดงรหัสผ่าน");
    togglePasswordBtn.setAttribute("title", "แสดงรหัสผ่าน");
    formError.textContent = "";
    submit.textContent = `เข้าสู่ระบบ ${name}`;
    if (domain.includes("kmitl")) {
      submit.style.backgroundColor = "var(--kmitl-color)";
    } else if (domain.includes("kmutt")) {
      submit.style.backgroundColor = "var(--kmutt-color)";
    } else if (domain.includes("kmutnb")) {
      submit.style.backgroundColor = "var(--kmutnb-color)";
    }
    submit.style.color = "#ffffff";
    emailInput.focus();
  };

  const resetSelection = (): void => {
    allUniButtons.forEach((btn) => {
      btn.style.display = "flex";
    });
    changeUniBtn.style.display = "none";
    ssoBadge.style.display = "inline-flex";
    credentialsToggleWrap.style.display = "none";
    emailInput.value = "";
    passwordInput.value = "";
    passwordInput.type = "password";
    togglePasswordBtn.innerHTML = eyeIcon;
    togglePasswordBtn.setAttribute("aria-label", "แสดงรหัสผ่าน");
    togglePasswordBtn.setAttribute("title", "แสดงรหัสผ่าน");
    submit.style.backgroundColor = "";
    formError.textContent = "";
  };

  btnKmitl.addEventListener("click", () =>
    selectUniversity(btnKmitl, "KMITL (สจล.)", "@kmitl.ac.th"),
  );
  btnKmutt.addEventListener("click", () =>
    selectUniversity(btnKmutt, "KMUTT (มจธ.)", "@kmutt.ac.th"),
  );
  btnKmutnb.addEventListener("click", () =>
    selectUniversity(btnKmutnb, "KMUTNB (มจพ.)", "@kmutnb.ac.th"),
  );

  const changeUniBtn = el("button", {
    className: "button button--ghost button--small",
    attrs: {
      type: "button",
      style:
        "display: none; margin: 6px auto 0; color: var(--brand-rust); font-weight: 700;",
    },
    text: "← เปลี่ยนสถาบัน",
  });
  changeUniBtn.addEventListener("click", resetSelection);

  buttonsGroup.append(btnKmitl, btnKmutt, btnKmutnb, changeUniBtn);

  const ssoBadge = el("div", { className: "auth-sso-badge" });
  ssoBadge.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>เข้าสู่ระบบผ่าน SSO ปลอดภัย</span>`;

  // Expandable Credentials Form for direct email/password (hidden by default)
  const credentialsToggleWrap = el("div", {
    className: "auth-credentials-toggle",
    attrs: { style: "display: none;" },
  });

  const form = el("form", {
    className: "form",
    attrs: { novalidate: "true", style: "text-align: left;" },
  });

  const emailInput = el("input", {
    className: "input-domain-field",
    attrs: {
      id: "email",
      name: "email",
      type: "text",
      placeholder: "เช่น 65010001 หรือชื่อผู้ใช้",
      required: "true",
      autocomplete: "username",
    },
  });

  // Strip @ if user types or pastes it
  emailInput.addEventListener("input", () => {
    if (emailInput.value.includes("@")) {
      emailInput.value = emailInput.value.replace(/@.*/g, "");
    }
  });

  const domainSuffix = el("span", {
    className: "input-domain-suffix",
    text: "@kmitl.ac.th",
    attrs: { title: "นามสกุลอีเมลสถาบัน" },
  });
  domainSuffix.addEventListener("click", () => {
    emailInput.focus();
  });

  const emailWrap = el("div", { className: "input-domain-wrap" });
  emailWrap.append(emailInput, domainSuffix);

  const passwordInput = el("input", {
    className: "input",
    attrs: {
      id: "password",
      name: "password",
      type: "password",
      placeholder: "••••••••",
      required: "true",
    },
  });

  const togglePasswordBtn = el("button", {
    className: "btn-toggle-password",
    attrs: {
      type: "button",
      "aria-label": "แสดงรหัสผ่าน",
      title: "แสดงรหัสผ่าน",
    },
  });
  togglePasswordBtn.innerHTML = eyeIcon;

  togglePasswordBtn.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    togglePasswordBtn.innerHTML = isPassword ? eyeOffIcon : eyeIcon;
    const label = isPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน";
    togglePasswordBtn.setAttribute("aria-label", label);
    togglePasswordBtn.setAttribute("title", label);
    passwordInput.focus();
  });

  const passwordWrap = el("div", { className: "input-password-wrap" });
  passwordWrap.append(passwordInput, togglePasswordBtn);

  const submit = el("button", {
    className: "button button--primary button--full btn-auth-submit",
    text: "เข้าสู่ระบบด้วยอีเมล",
    attrs: { type: "submit" },
  });
  const formError = el("p", {
    className: "form-error",
    attrs: { role: "alert" },
  });

  form.append(
    field("email", "อีเมลสถาบัน", emailWrap),
    field("password", "รหัสผ่าน", passwordWrap),
    formError,
    submit,
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    formError.textContent = "";

    const rawPrefix = emailInput.value.trim();
    const cleanPrefix = rawPrefix.includes("@")
      ? (rawPrefix.split("@")[0] ?? "")
      : rawPrefix;
    const fullEmail = cleanPrefix ? `${cleanPrefix}${currentDomain}` : "";

    const result = loginSchema.safeParse({
      email: fullEmail,
      password: passwordInput.value,
    });
    if (!result.success) {
      showZodErrors(form, result.error);
      return;
    }

    submit.disabled = true;
    submit.textContent = "กำลังเข้าสู่ระบบ…";
    try {
      await authApi.login(result.data);
      toast.success("เข้าสู่ระบบสำเร็จ");
      const returnTo = safeReturnTo(context.query.get("returnTo"));
      window.history.pushState(null, "", returnTo);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (error) {
      formError.textContent = errorMessage(error);
      submit.disabled = false;
      submit.textContent = selectedUniName
        ? `เข้าสู่ระบบ ${selectedUniName}`
        : "เข้าสู่ระบบด้วยอีเมล";
    }
  });

  const registerLinkWrap = el("p", {
    className: "auth-register-prompt",
    attrs: {
      style:
        "margin-top: 20px; margin-bottom: 0; font-size: 0.86rem; color: #736b63; text-align: center;",
    },
  });
  registerLinkWrap.append(
    document.createTextNode("ยังไม่มีบัญชีใช่หรือไม่? "),
    el("a", {
      className: "text-link",
      text: "สมัครสมาชิกที่นี่",
      attrs: { href: "/register" },
    }),
  );

  credentialsToggleWrap.append(form);

  card.append(
    cardTitle,
    cardSubtitle,
    buttonsGroup,
    ssoBadge,
    credentialsToggleWrap,
    registerLinkWrap,
  );

  // 3. Footer Section
  const footer = el("footer", { className: "auth-landing-footer" });
  const linksWrap = el(
    "div",
    { className: "auth-footer-links" },
    el("a", { attrs: { href: "#" }, text: "นโยบายความเป็นส่วนตัว" }),
    el("span", { text: "•" }),
    el("a", { attrs: { href: "#" }, text: "ข้อกำหนดการใช้งาน" }),
    el("span", { text: "•" }),
    el("a", { attrs: { href: "#" }, text: "ติดต่อฝ่ายสนับสนุน" }),
  );
  const copyright = el("div", {
    className: "auth-footer-copy",
    text: "© 2024 TechEdu Connect. เครือข่ายแลกเปลี่ยน 3 สถาบันพระจอมเกล้า.",
  });
  footer.append(linksWrap, copyright);

  container.append(hero, card, footer);

  return { title: "King’s society - เข้าสู่ระบบ", element: container };
}

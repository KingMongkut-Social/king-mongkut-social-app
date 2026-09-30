import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function css(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('UI control style contract', () => {
  it('defines every shared button variant used by the application', () => {
    const buttons = css('src/styles/buttons.css');
    for (const selector of [
      '.button--primary',
      '.button--secondary',
      '.button--ghost',
      '.button--danger',
      '.button--small',
      '.button--full',
      '.icon-btn',
    ]) {
      expect(buttons).toContain(selector);
    }
    expect(buttons).toContain(':focus-visible');
    expect(buttons).toContain(':disabled');
  });

  it('keeps post social controls out of browser-default styling', () => {
    const posts = css('src/modules/posts/posts.css');
    for (const selector of [
      '.reaction-btn',
      '.reaction-btn--danger',
      '.reaction-choice',
      '.btn-reply-comment',
      '.comment-input-wrap',
      '.btn-send-comment',
      '.feeling-picker-btn',
      '.lightbox-btn',
      '.edit-post-modal__close-btn',
    ]) {
      expect(posts).toContain(selector);
    }
  });

  it('keeps academic combobox markup and CSS names aligned', () => {
    const forms = css('src/styles/forms.css');
    for (const selector of [
      '.academic-combobox__wrapper',
      '.academic-combobox__clear',
      '.academic-combobox__toggle',
      '.academic-combobox__popover',
      '.academic-combobox__item.is-active',
    ]) {
      expect(forms).toContain(selector);
    }
  });

  it('styles report and profile overlay controls', () => {
    const dialogs = css('src/styles/dialog.css');
    const profile = css('src/modules/profile/profile.css');
    expect(dialogs).toContain('.modal-overlay');
    expect(dialogs).toContain('.report-dialog__actions');
    expect(profile).toContain('.profile-preview-modal__close-btn');
    expect(profile).toContain('.edit-profile-actions');
  });
});

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
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
  it('does not allow static custom button classes without a CSS contract', () => {
    const testsDir = dirname(fileURLToPath(import.meta.url));
    const srcDir = join(testsDir, '..', 'src');

    const walk = (dir: string, extension: string): string[] => {
      const found: string[] = [];
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        const info = statSync(path);
        if (info.isDirectory()) found.push(...walk(path, extension));
        else if (path.endsWith(extension)) found.push(path);
      }
      return found;
    };

    const allCss = walk(srcDir, '.css').map((path) => readFileSync(path, 'utf8')).join('\n');
    const unstyled: string[] = [];

    for (const path of walk(srcDir, '.ts')) {
      const source = readFileSync(path, 'utf8');
      const pattern = /el\('button',\s*\{[\s\S]{0,180}?className:\s*'([^']+)'/g;
      for (const match of source.matchAll(pattern)) {
        const classes = (match[1] ?? '').split(/\s+/).filter(Boolean);
        if (classes.includes('button') || classes.includes('icon-btn')) continue;
        for (const className of classes) {
          if (className.includes('$')) continue;
          if (!allCss.includes('.' + className)) {
            unstyled.push(path.replace(srcDir, 'src') + ' -> .' + className);
          }
        }
      }
    }

    expect(unstyled, 'unstyled custom button classes:\n' + unstyled.join('\n')).toEqual([]);
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

describe('responsive application shell contract', () => {
  it('keeps the desktop sidebar at one fixed width without flex shrink', () => {
    const css = source('src/app/sidebar.css');
    expect(css).toContain('flex: 0 0 var(--layout-sidebar-width)');
    expect(css).toContain('min-width: var(--layout-sidebar-width)');
    expect(css).toContain('max-width: var(--layout-sidebar-width)');
    expect(css).toContain('@media (min-width: 1024px)');
  });

  it('uses the same desktop breakpoint for sidebar and mobile navigation', () => {
    const sidebar = source('src/app/sidebar.css');
    const mobile = source('src/app/mobile-nav.css');
    expect(sidebar).toContain('@media (min-width: 1024px)');
    expect(mobile).toContain('@media (min-width: 1024px)');
    expect(mobile).not.toContain('@media (min-width: 900px)');
  });

  it('keeps feed rail and chat behavior on intentional breakpoints', () => {
    const shell = source('src/app/shell.css');
    const chat = source('src/modules/chats/chat.css');
    expect(shell).toContain('@media (min-width: 1280px)');
    expect(shell).toContain('var(--layout-right-rail-width)');
    expect(chat).toContain('@media (max-width: 1023px)');
  });

  it('turns an opened mobile chat thread into a true full-screen surface', () => {
    const shell = source('src/app/shell.css');
    const chat = source('src/modules/chats/chat.css');
    expect(shell).toContain('body.is-chat-thread-open .site-header');
    expect(shell).toContain('body.is-chat-thread-open .mobile-primary-nav');
    expect(shell).toContain('height: 100dvh');
    expect(chat).toContain('body.is-chat-thread-open .chat-page');
    expect(chat).toContain('.chat-workspace.chat-workspace--thread-open');
  });

  it('provides shared mobile-safe tab touch targets', () => {
    const tabs = source('src/styles/tabs.css');
    expect(tabs).toContain('var(--touch-target-mobile)');
    expect(tabs).toContain('.search-tab-btn:focus-visible');
    expect(tabs).toContain('.subtab-btn:focus-visible');
  });
});

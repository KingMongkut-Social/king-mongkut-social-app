import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

describe('production UX regression contract', () => {
  it('keeps dashboard destructive actions inside the post overflow menu', () => {
    const dashboard = source('src/modules/posts/my-posts-page.ts');
    const postCard = source('src/modules/posts/post-components.ts');

    expect(dashboard).not.toContain('dashboard-post__danger');
    expect(dashboard).not.toContain("text: 'ลบโพสต์'");
    expect(postCard).toContain('post-dropdown-item--danger');
    expect(postCard).toContain("'aria-haspopup': 'true'");
  });

  it('keeps secondary post actions in a mobile-safe overflow menu', () => {
    const social = source('src/modules/posts/post-social.ts');
    const css = source('src/modules/posts/posts.css');

    expect(social).toContain('post-social-menu');
    expect(social).toContain('ตัวเลือกเพิ่มเติม');
    expect(social).toContain('รายงานโพสต์');
    expect(social).toContain('reactions.append(reactionWrap, commentBtn, shareBtn, moreWrap)');
    expect(css).toContain('.post-social-menu');
    expect(css).toContain('grid-template-columns: repeat(3, minmax(0, 1fr)) 44px');
  });

  it('uses explicit 3 / 2 / 1 university discovery columns', () => {
    const css = source('src/modules/universities/universities.css');

    expect(css).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(css).toContain('@media (max-width: 1023px)');
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(css).toContain('@media (max-width: 639px)');
    expect(css).toContain('grid-template-columns: 1fr');
  });

  it('provides actionable empty states for social discovery', () => {
    const friends = source('src/modules/friends/connections-page.ts');
    const groups = source('src/modules/groups/groups-page.ts');
    const chat = source('src/modules/chats/chat-page.ts');

    expect(friends).toContain('ดูคนที่คุณอาจรู้จัก');
    expect(friends).toContain('ค้นหาเพื่อน');
    expect(groups).toContain('สร้างกลุ่มแรก');
    expect(groups).toContain('createEmptyState');
    expect(chat).toContain('สร้างกลุ่มสนทนา');
    expect(chat).toContain('ค้นหาเพื่อน');
    expect(chat).toContain('createEmptyState');
  });

  it('keeps the mobile chat thread safe and ergonomic', () => {
    const css = source('src/modules/chats/chat.css');

    expect(css).toContain('100dvh');
    expect(css).toContain('env(safe-area-inset-bottom');
    expect(css).toContain('var(--touch-target-mobile)');
    expect(css).toContain('position: sticky');
  });

  it('routes shell and post action icons through the shared React icon abstraction', () => {
    const layout = source('src/app/layout.ts');
    const feed = source('src/modules/posts/posts-page.ts');
    const postCard = source('src/modules/posts/post-components.ts');

    expect(layout).not.toContain('const icons = {');
    expect(layout).not.toContain('const accountIcons = {');
    expect(layout).toContain('reactIcon(navigationIcons[entry.icon]');
    expect(feed).not.toContain('const icons = {');
    expect(postCard).not.toContain('const postIcons = {');
    expect(postCard).toContain("reactIcon('ellipsis')");
  });
});

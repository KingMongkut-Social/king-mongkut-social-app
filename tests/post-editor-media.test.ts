// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RouteContext } from '../src/core/router/router';
import { postEditorPage } from '../src/modules/posts/post-editor-page';

const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  upload: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../src/modules/posts/posts-api', () => ({
  assetUrl: (url: string) => url,
  postsApi: mocks,
}));

afterEach(() => {
  vi.clearAllMocks();
  document.body.replaceChildren();
});

describe('post editor media', () => {
  it('keeps existing media and uploads a new image before saving an image-only post', async () => {
    mocks.getById.mockResolvedValue({
      data: { post: {
        _id: 'post-id', title: 'รูปภาพ', content: '', status: 'published',
        images: ['/api/v1/posts/uploads/old.png'],
        attachments: [{ url: '/api/v1/posts/uploads/notes.pdf', name: 'notes.pdf', mimeType: 'application/pdf', size: 100 }],
      } },
    });
    mocks.upload.mockResolvedValue({ data: { asset: { url: '/api/v1/posts/uploads/new.png', name: 'new.png', mimeType: 'image/png', size: 4 } } });
    mocks.update.mockResolvedValue({ data: { post: {} } });

    const url = new URL('/dashboard/posts/post-id/edit', 'http://localhost:3000');
    const context: RouteContext = { url, params: { id: 'post-id' }, query: url.searchParams };
    const page = await postEditorPage(context);
    document.body.append(page.element);

    const imageInput = page.element.querySelector<HTMLInputElement>('#images')!;
    const file = new File(['data'], 'new.png', { type: 'image/png' });
    Object.defineProperty(imageInput, 'files', { configurable: true, value: [file] });
    imageInput.dispatchEvent(new Event('change'));
    page.element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(mocks.upload).toHaveBeenCalledWith(file);
    expect(mocks.update).toHaveBeenCalledWith('post-id', expect.objectContaining({
      content: '',
      images: ['/api/v1/posts/uploads/old.png', '/api/v1/posts/uploads/new.png'],
      coverImage: '/api/v1/posts/uploads/old.png',
      attachments: [expect.objectContaining({ name: 'notes.pdf' })],
    }));
  });
});

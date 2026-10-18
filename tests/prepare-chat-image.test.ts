// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareChatImage } from '../src/modules/chats/prepare-chat-image';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('mobile chat photos', () => {
  it('preserves supported photos and handles a missing MIME type from a file picker', async () => {
    const normal = new File(['photo'], 'photo.png', { type: 'image/png' });
    expect(await prepareChatImage(normal)).toBe(normal);
    const missing = new File(['photo'], 'photo.JPG');
    expect((await prepareChatImage(missing)).type).toBe('image/jpeg');
  });

  it('explains when the browser cannot decode HEIC and releases its object URL', async () => {
    const revoke = vi.fn();
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = () => 'blob:heic';
      static override revokeObjectURL = revoke;
    });
    vi.stubGlobal('Image', class { src = ''; decode = () => Promise.reject(new Error('unsupported')); });
    await expect(prepareChatImage(new File(['heic'], 'photo.heic', { type: 'image/heic' }))).rejects.toThrow('HEIC');
    expect(revoke).toHaveBeenCalledWith('blob:heic');
  });

  it('converts decodable HEIC and oversized photos to a smaller JPEG', async () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = vi.fn(() => 'blob:source');
      static override revokeObjectURL = revokeObjectURL;
    });
    vi.stubGlobal('Image', class {
      src = '';
      naturalWidth = 4032;
      naturalHeight = 3024;
      decode = () => Promise.resolve();
    });
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn(), drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['jpeg'], { type: 'image/jpeg' })));
    for (const file of [new File(['heic'], 'photo.heic', { type: 'image/heic' }), new File([new Uint8Array(11 * 1024 * 1024)], 'large.png', { type: 'image/png' })]) {
      const result = await prepareChatImage(file);
      expect(result.type).toBe('image/jpeg');
      expect(result.name).toMatch(/\.jpg$/);
      expect(result.size).toBeLessThan(10 * 1024 * 1024);
    }
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2048, 1536);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});

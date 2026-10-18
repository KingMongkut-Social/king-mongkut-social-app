const maxBytes = 10 * 1024 * 1024;
const supported = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);
const mimeByExtension: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', heic: 'image/heic', heif: 'image/heif',
};

export async function prepareChatImage(file: File): Promise<File> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mime = file.type || mimeByExtension[extension] || '';
  const heic = /image\/hei[cf]/.test(mime);
  if (!supported.has(mime) && !heic) throw new Error('รองรับเฉพาะรูป JPEG, PNG, GIF, WebP และ AVIF');
  if (!heic && file.size <= maxBytes) {
    return file.type ? file : new File([file], file.name, { type: mime, lastModified: file.lastModified });
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new Error(heic ? 'เบราว์เซอร์นี้แปลง HEIC ไม่ได้ กรุณาเลือกรูป JPEG หรือ PNG' : 'อ่านรูปภาพไม่ได้ กรุณาเลือกรูปใหม่');
    }
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('ไม่สามารถเตรียมรูปภาพได้ กรุณาเลือกรูปขนาดไม่เกิน 10 MB');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size > maxBytes) throw new Error('รูปภาพต้องมีขนาดไม่เกิน 10 MB');
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

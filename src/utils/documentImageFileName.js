const extOf = (name = '') => {
  const match = /\.([^.]+)$/i.exec(String(name || '').trim());
  return match ? match[1].toLowerCase() : '';
};

/**
 * Bỏ hậu tố địa điểm camera (vd: 2026-08-03 14.15.30_P. Tân Sơn Hòa.jpg)
 * và chuẩn hóa tên file chỉ còn ký tự ASCII an toàn.
 */
export const sanitizeUploadFileName = (fileName, { fallbackStamp = Date.now() } = {}) => {
  const raw = String(fileName || '').trim();
  const ext = extOf(raw) || 'jpg';
  let base = extOf(raw) ? raw.slice(0, -(ext.length + 1)) : raw;

  // Hậu tố địa điểm do camera/điện thoại gắn: ..._P. Tên quận/huyện
  base = base.replace(/_P\.[\s\S]*$/i, '');

  base = base
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (!base) base = String(fallbackStamp);
  return `${base}.${ext}`;
};

export const withSafeUploadFileName = (file, options) => {
  const safeName = sanitizeUploadFileName(file?.name, options);
  if (!file || safeName === file.name) return file;
  return new File([file], safeName, {
    type: file.type || 'application/octet-stream',
    lastModified: file.lastModified || Date.now(),
  });
};

/** Trang tải ảnh ngoài (giữ HTTP như hệ thống cũ). */
export const DEFAULT_UPLOAD_PAGE_URL = 'http://api2026.otobathanh.vn/upload.html';
export const DEFAULT_PUBLIC_IMAGE_BASE = 'http://api2026.otobathanh.vn/';

export const getUploadBaseUrl = () => {
  const fromEnv = String(import.meta.env.VITE_UPLOAD_PAGE_URL || '').trim();
  return fromEnv || DEFAULT_UPLOAD_PAGE_URL;
};

export const getPublicImageBase = () => {
  const fromEnv = String(import.meta.env.VITE_DOCUMENT_IMAGE_PUBLIC_BASE || '').trim();
  const base = fromEnv || DEFAULT_PUBLIC_IMAGE_BASE;
  return base.replace(/\/?$/, '/');
};

export const extractSoChungTu = (qrText) => {
  const rawValue = String(qrText || '').trim();
  if (!rawValue) return '';

  try {
    const url = new URL(rawValue);
    return String(url.searchParams.get('khoa') || url.searchParams.get('soChungTu') || '')
      .trim()
      .toUpperCase();
  } catch {
    return rawValue.toUpperCase();
  }
};

export const isValidSoChungTu = (value) => /^TT[A-Z0-9]+$/.test(value);

export const buildUploadUrl = (soChungTu) => {
  const base = getUploadBaseUrl();
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}soChungTu=${encodeURIComponent(String(soChungTu || '').trim().toUpperCase())}`;
};

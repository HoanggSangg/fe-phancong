/** Trang tải ảnh ngoài (giữ HTTP như hệ thống cũ). */
export const DEFAULT_UPLOAD_PAGE_URL = 'http://api2026.otobathanh.vn/upload.html';

export const getUploadBaseUrl = () => {
  const fromEnv = String(import.meta.env.VITE_UPLOAD_PAGE_URL || '').trim();
  return fromEnv || DEFAULT_UPLOAD_PAGE_URL;
};

const matchSoChungTu = (text) => {
  const match = String(text || '').toUpperCase().match(/TT[A-Z0-9]+/);
  return match ? match[0] : '';
};

/** Lấy mã TT từ QR: query, path `/baogia/TT...`, hoặc chuỗi chứa TT. */
export const extractSoChungTu = (qrText) => {
  const rawValue = String(qrText || '').trim();
  if (!rawValue) return '';

  try {
    const url = new URL(rawValue);
    const fromQuery = String(
      url.searchParams.get('khoa')
      || url.searchParams.get('soChungTu')
      || '',
    )
      .trim()
      .toUpperCase();
    const fromQueryMatch = matchSoChungTu(fromQuery);
    if (fromQueryMatch) return fromQueryMatch;

    const fromPath = matchSoChungTu(url.pathname);
    if (fromPath) return fromPath;
  } catch {
    // không phải URL đầy đủ
  }

  return matchSoChungTu(rawValue) || rawValue.toUpperCase();
};

export const isValidSoChungTu = (value) => /^TT[A-Z0-9]+$/.test(value);

export const buildUploadUrl = (soChungTu) => {
  const base = getUploadBaseUrl();
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}soChungTu=${encodeURIComponent(String(soChungTu || '').trim().toUpperCase())}`;
};

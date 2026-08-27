import { api, API_BASE, getStoredToken } from '../components/apis/axios';

export const IMAGE_KIND_CAR = 'car';
export const IMAGE_KIND_PARTS = 'parts';

export const PUBLIC_IMAGE_HOST = 'http://api2026.otobathanh.vn/';

/** Ảnh xe: TT... — Ảnh phụ tùng: hpt/TT... */
export const buildDocKey = (soChungTu, kind = IMAGE_KIND_CAR) => {
  const code = String(soChungTu || '')
    .trim()
    .toUpperCase()
    .replace(/^HPT\//, '');
  if (!code) return '';
  return kind === IMAGE_KIND_PARTS ? `hpt/${code}` : code;
};

export const getDocumentFiles = async (soChungTu) => {
  const { data } = await api.get('/document-images/files', {
    params: { soChungTu },
    skipAuthRedirect: true,
  });
  return Array.isArray(data) ? data : [];
};

export const uploadDocumentFile = (soChungTu, file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file, file.name);

  const params = new URLSearchParams({
    soChungTu: String(soChungTu || '').trim(),
  });
  if (file?.name) params.set('fileName', String(file.name).trim());

  return api.post(`/document-images/upload?${params.toString()}`, formData, {
    timeout: 0,
    skipAuthRedirect: true,
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(event.loaded / event.total);
    },
  });
};

export const getDocumentImageContext = async (soChungTu) => {
  const { data } = await api.get('/document-images/context', {
    params: { soChungTu },
    skipAuthRedirect: true,
  });
  return data;
};

export const deleteDocumentFile = async (soChungTu, fileName) => {
  const { data } = await api.delete('/document-images/file', {
    params: { soChungTu, fileName },
  });
  return data;
};

/** URL public HTTP trên api2026 (dùng cho xóa / tham chiếu hệ thống cũ). */
export const getPublicDocumentFileUrl = (soChungTu, fileName) => {
  const docPath = String(soChungTu || '')
    .trim()
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${PUBLIC_IMAGE_HOST.replace(/\/?$/, '/')}Uploads/${docPath}/${encodeURIComponent(fileName)}`;
};

/** URL xem qua API HTTPS (tránh mixed-content). */
export const getDocumentFileUrl = (soChungTu, fileName, { download = false } = {}) => {
  const params = new URLSearchParams({
    soChungTu: String(soChungTu || '').trim(),
    fileName: String(fileName || '').trim(),
  });
  if (download) params.set('download', '1');
  const token = getStoredToken();
  if (token) params.set('access_token', token);
  return `${API_BASE}/document-images/content?${params.toString()}`;
};

const readBlobError = async (blob) => {
  if (!(blob instanceof Blob)) return '';
  try {
    const text = await blob.text();
    const parsed = JSON.parse(text);
    return parsed?.message || parsed?.detail || '';
  } catch {
    return '';
  }
};

export const fetchDocumentImageBlob = async (soChungTu, fileName) => {
  try {
    const { data } = await api.get('/document-images/content', {
      params: {
        soChungTu: String(soChungTu || '').trim(),
        fileName: String(fileName || '').trim(),
      },
      responseType: 'blob',
      timeout: 0,
      skipAuthRedirect: true,
    });
    if (data?.type?.includes('application/json')) {
      throw new Error((await readBlobError(data)) || 'Không tải được ảnh');
    }
    return data;
  } catch (error) {
    const fromBlob = await readBlobError(error?.response?.data);
    throw new Error(
      fromBlob
      || error?.response?.data?.message
      || error?.message
      || 'Không tải được ảnh',
    );
  }
};

/** Tải file qua blob — không đi qua trình quản lý tải HTTPS của Chrome. */
export const downloadDocumentFile = async (soChungTu, fileName, existingBlob = null) => {
  const name = String(fileName || '').trim();
  const data = existingBlob || await fetchDocumentImageBlob(soChungTu, name);
  const url = URL.createObjectURL(data);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
};

import { api } from '../components/apis/axios';

const PUBLIC_IMAGE_BASE = (
  import.meta.env.VITE_DOCUMENT_IMAGE_PUBLIC_BASE || 'http://api2026.otobathanh.vn/'
).replace(/\/?$/, '/');

export const getDocumentFiles = async (soChungTu) => {
  const { data } = await api.get('/document-images/files', {
    params: { soChungTu },
  });
  return Array.isArray(data) ? data : [];
};

export const uploadDocumentFile = (soChungTu, file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file, file.name);

  return api.post(`/document-images/upload?soChungTu=${encodeURIComponent(soChungTu)}`, formData, {
    timeout: 0,
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(event.loaded / event.total);
    },
  });
};

export const getDocumentFileUrl = (soChungTu, fileName) => {
  const docPath = String(soChungTu || '')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${PUBLIC_IMAGE_BASE}Uploads/${docPath}/${encodeURIComponent(fileName)}`;
};

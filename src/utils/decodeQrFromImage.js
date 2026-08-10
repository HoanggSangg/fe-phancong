import { Html5Qrcode } from 'html5-qrcode';
import jsQR from 'jsqr';
import { extractSoChungTu, isValidSoChungTu } from './uploadUrl';

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được file ảnh.'));
    };
    img.src = url;
  });

const decodeWithJsQr = async (file) => {
  const img = await loadImageElement(file);
  const canvas = document.createElement('canvas');
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height, 1));
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  return result?.data || '';
};

const decodeWithHtml5 = async (file) => {
  const elementId = `qr-file-reader-${Date.now()}`;
  const host = document.createElement('div');
  host.id = elementId;
  host.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
  document.body.appendChild(host);

  const scanner = new Html5Qrcode(elementId, { verbose: false });
  try {
    return await scanner.scanFile(file, true);
  } finally {
    try {
      await scanner.clear();
    } catch {
      // ignore
    }
    host.remove();
  }
};

/**
 * Đọc mã QR từ file ảnh (chụp sẵn / chọn từ thư viện).
 * @returns {{ text: string, soChungTu: string }}
 */
export const decodeQrFromImageFile = async (file) => {
  if (!file) {
    throw new Error('Chưa chọn ảnh.');
  }
  if (!String(file.type || '').startsWith('image/') && !/\.(jpe?g|png|gif|bmp|webp)$/i.test(file.name || '')) {
    throw new Error('File không phải ảnh.');
  }

  let text = '';
  try {
    text = await decodeWithJsQr(file);
  } catch {
    text = '';
  }

  if (!text) {
    try {
      text = await decodeWithHtml5(file);
    } catch {
      text = '';
    }
  }

  if (!text) {
    throw new Error('Không tìm thấy mã QR trong ảnh. Hãy chụp rõ, đủ sáng và thử lại.');
  }

  const soChungTu = extractSoChungTu(text);
  if (!isValidSoChungTu(soChungTu)) {
    throw new Error(
      `Đã đọc QR nhưng không phải số chứng từ TT hợp lệ.\nNội dung: ${String(text).slice(0, 120)}`,
    );
  }

  return { text, soChungTu };
};

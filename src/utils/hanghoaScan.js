import { Html5QrcodeSupportedFormats } from 'html5-qrcode';

export const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODABAR,
];

export const extractHanghoaCode = (rawValue) => {
  const text = String(rawValue || '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    const fromQuery = String(
      url.searchParams.get('ma')
      || url.searchParams.get('maHangHoa')
      || url.searchParams.get('khoa')
      || url.searchParams.get('khoaHangHoa')
      || '',
    ).trim();
    if (fromQuery) return fromQuery;
  } catch {
    // không phải URL
  }
  return text.split(/\s|\n|\r/)[0] || text;
};

export const fmtQty = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1000) / 1000);
};

export const normHanghoa = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '');

export const rowMatchesHanghoa = (row, item, scanned) => {
  const scannedNorm = normHanghoa(scanned);
  const rowMa = normHanghoa(row?.ma);
  const rowKhoa = normHanghoa(row?.khoa);
  if (item?.khoa && row?.khoa && String(row.khoa) === String(item.khoa)) return true;
  if (item?.ma && rowMa && rowMa === normHanghoa(item.ma)) return true;
  if (scannedNorm && (rowMa === scannedNorm || rowKhoa === scannedNorm)) return true;
  return false;
};

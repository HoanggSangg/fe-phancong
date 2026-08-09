import dayjs from 'dayjs';

export const INSURANCE_WARN_DAYS = 7;

/** Số ngày còn lại tới hết hạn (âm = đã quá hạn). null nếu không có ngày. */
export const daysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const end = dayjs(expiryDate).startOf('day');
  if (!end.isValid()) return null;
  return end.diff(dayjs().startOf('day'), 'day');
};

/** Tô đỏ / nhắc khi còn ≤ 7 ngày hoặc đã quá hạn. */
export const isInsuranceExpiringSoon = (expiryDate, days = INSURANCE_WARN_DAYS) => {
  const left = daysUntilExpiry(expiryDate);
  if (left == null) return false;
  return left <= days;
};

export const formatExpiryLabel = (expiryDate) => {
  const left = daysUntilExpiry(expiryDate);
  if (left == null) return '';
  if (left < 0) return `Quá hạn ${Math.abs(left)} ngày`;
  if (left === 0) return 'Hết hạn hôm nay';
  return `Còn ${left} ngày`;
};

export const formatDateInput = (value) => {
  if (!value) return '';
  const d = dayjs(value);
  return d.isValid() ? d.format('YYYY-MM-DD') : '';
};

export const formatDateDisplay = (value) => {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY') : '—';
};

/** Gợi ý hết hạn = ngày giao + 1 năm. */
export const suggestExpiryFromDelivery = (deliveryDate) => {
  if (!deliveryDate) return '';
  const d = dayjs(deliveryDate);
  if (!d.isValid()) return '';
  return d.add(1, 'year').format('YYYY-MM-DD');
};

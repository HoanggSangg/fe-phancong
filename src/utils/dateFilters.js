export const formatDateLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayDate = () => formatDateLocal(new Date());

export const getYesterdayDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateLocal(yesterday);
};

export const getDateRangeForPeriod = (period) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (period === 'today') {
    const d = formatDateLocal(today);
    return { from: d, to: d };
  }

  if (period === 'week') {
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(today);
    start.setDate(today.getDate() + diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: formatDateLocal(start), to: formatDateLocal(end) };
  }

  if (period === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: formatDateLocal(start), to: formatDateLocal(end) };
  }

  return { from: getTodayDate(), to: getTodayDate() };
};

export const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'custom', label: 'Khoảng ngày' },
];

export const formatMoney = (value) =>
  Number(value || 0).toLocaleString('vi-VN') + ' ₫';

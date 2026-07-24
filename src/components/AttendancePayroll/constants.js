export const now = new Date();
export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
export const YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);
export const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const MONEY_FIELDS = [
  { key: 'phuCap', label: 'Phụ cấp' },
  { key: 'thuong', label: 'Thưởng' },
  { key: 'tangCa', label: 'Tăng ca' },
  { key: 'hoTro', label: 'Hỗ trợ' },
  { key: 'baoHiem', label: 'Bảo hiểm' },
  { key: 'phat', label: 'Phạt' },
  { key: 'thue', label: 'Thuế' },
  { key: 'tamUng', label: 'Tạm ứng' },
  { key: 'khauTruKhac', label: 'Khấu trừ khác' },
];

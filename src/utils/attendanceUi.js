/** Màu / nhãn trạng thái chấm công (đồng bộ backend) */
export const ATTENDANCE_STATUS_META = {
  present: { label: 'Đi làm đủ', color: '#16a34a', bg: '#dcfce7' },
  unpaid_full: { label: 'Nghỉ cả ngày', color: '#dc2626', bg: '#fee2e2' },
  paid_full: { label: 'Nghỉ cả ngày', color: '#dc2626', bg: '#fee2e2' },
  morning_off: { label: 'Nghỉ sáng', color: '#ca8a04', bg: '#fef9c3' },
  afternoon_off: { label: 'Nghỉ chiều', color: '#ca8a04', bg: '#fef9c3' },
  hourly_leave: { label: 'Nghỉ theo giờ', color: '#ca8a04', bg: '#fef9c3' },
  late: { label: 'Đi trễ', color: '#ea580c', bg: '#ffedd5' },
  early: { label: 'Về sớm', color: '#ea580c', bg: '#ffedd5' },
  late_early: { label: 'Trễ & về sớm', color: '#ea580c', bg: '#ffedd5' },
  annual_leave: { label: 'Nghỉ phép', color: '#dc2626', bg: '#fee2e2' },
  sick_paid: { label: 'Nghỉ bệnh', color: '#dc2626', bg: '#fee2e2' },
  sick_unpaid: { label: 'Nghỉ bệnh', color: '#dc2626', bg: '#fee2e2' },
  holiday: { label: 'Nghỉ lễ (hưởng lương)', color: '#2563eb', bg: '#dbeafe' },
  business_trip: { label: 'Công tác', color: '#7c3aed', bg: '#ede9fe' },
  compensatory: { label: 'Nghỉ bù', color: '#dc2626', bg: '#fee2e2' },
  sunday: { label: 'Chủ nhật', color: '#64748b', bg: '#f1f5f9' },
  other: { label: 'Khác', color: '#64748b', bg: '#f1f5f9' },
};

export const QUICK_STATUSES = [
  { status: 'present', label: 'Đi làm đủ' },
  { status: 'unpaid_full', label: 'Nghỉ cả ngày' },
  { status: 'morning_off', label: 'Nghỉ sáng' },
  { status: 'afternoon_off', label: 'Nghỉ chiều' },
  { status: 'annual_leave', label: 'Nghỉ phép' },
  { status: 'late', label: 'Đi trễ' },
  { status: 'early', label: 'Về sớm' },
  { status: 'hourly_leave', label: 'Nghỉ theo giờ' },
  { status: 'sick_unpaid', label: 'Nghỉ bệnh' },
  { status: 'compensatory', label: 'Nghỉ bù' },
  { status: 'business_trip', label: 'Công tác' },
  { status: 'holiday', label: 'Nghỉ lễ' },
];

export const TIME_PRESETS = [
  { label: 'Trễ 15′', patch: { status: 'late', lateMinutes: 15 } },
  { label: 'Trễ 30′', patch: { status: 'late', lateMinutes: 30 } },
  { label: 'Trễ 60′', patch: { status: 'late', lateMinutes: 60 } },
  { label: 'Về sớm 30′', patch: { status: 'early', earlyLeaveMinutes: 30 } },
  { label: 'Về sớm 60′', patch: { status: 'early', earlyLeaveMinutes: 60 } },
  { label: 'Nghỉ 2 giờ', patch: { status: 'hourly_leave', leaveMinutes: 120 } },
  { label: 'Nghỉ 4 giờ', patch: { status: 'hourly_leave', leaveMinutes: 240 } },
];

export const getStatusMeta = (status) =>
  ATTENDANCE_STATUS_META[status] || ATTENDANCE_STATUS_META.other;

export const parseDayListInput = (text = '') => {
  const parts = String(text)
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const days = [];
  parts.forEach((p) => {
    const n = Number(p);
    if (Number.isInteger(n) && n >= 1 && n <= 31) days.push(n);
  });
  return [...new Set(days)];
};

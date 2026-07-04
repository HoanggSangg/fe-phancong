export const CAR_STATUS_COLORS = {
  pending: 'default',
  working: 'warning',
  done: 'success',
  waiting_wash: 'info',
  waiting_handover: 'primary',
  delivered: 'success',
  additional_repair: 'error',
};

export const CAR_STATUS_TRANSITIONS = {
  pending: ['working'],
  working: ['done', 'pending'],
  done: ['waiting_wash', 'waiting_handover'],
  waiting_wash: ['waiting_handover', 'additional_repair'],
  waiting_handover: ['additional_repair', 'delivered'],
  delivered: [],
  additional_repair: ['done'],
};

export const CONDITION_OPTIONS = {
  vip: { label: 'VIP', color: 'warning' },
  good: { label: 'Tốt', color: 'success' },
  normal: { label: 'Bình thường', color: 'default' },
  warranty: { label: 'Bảo hành', color: 'info' },
  rescue: { label: 'Cứu hộ', color: 'error' },
  null: { label: 'Bình thường', color: 'default' },
};

export const getAvailableStatusTransitions = (currentStatus) =>
  CAR_STATUS_TRANSITIONS[currentStatus] || [];

export const needsWorkerSelection = (currentStatus, newStatus) =>
  (currentStatus === 'done' && newStatus === 'waiting_wash')
  || (['done', 'waiting_wash'].includes(currentStatus) && newStatus === 'waiting_handover')
  || (['waiting_wash', 'waiting_handover'].includes(currentStatus) && newStatus === 'additional_repair');

export const getConditionConfig = (condition) =>
  CONDITION_OPTIONS[condition] || CONDITION_OPTIONS.null;

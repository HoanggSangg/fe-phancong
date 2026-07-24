export const mapRepairItemToState = (item) => {
  const base = {
    ...item,
    isManual: Boolean(item.isManual),
  };

  if (item.workerAssignments?.length > 0) {
    return {
      ...base,
      selectedWorkers: item.workerAssignments.map((assignment) => ({
        worker: assignment.worker,
        percentage: assignment.percentage ?? 100,
      })),
    };
  }

  if (item.worker) {
    return {
      ...base,
      selectedWorkers: [{ worker: item.worker, percentage: 100 }],
    };
  }

  return {
    ...base,
    selectedWorkers: [{ worker: null, percentage: 100 }],
  };
};

export const createEmptyManualItem = () => ({
  _id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  isManual: true,
  groupName: 'Phát sinh',
  content: '',
  quantity: 1,
  unitPrice: 0,
  amount: 0,
  unitCostPrice: 0,
  costAmount: 0,
  unit: '',
  selectedWorkers: [{ worker: null, percentage: 100 }],
});

export const getItemWorkerTotalPercentage = (item) =>
  (item.selectedWorkers || [])
    .filter((entry) => entry.worker)
    .reduce((sum, entry) => sum + (Number(entry.percentage) || 0), 0);

export const isItemWorkerPercentageValid = (item) => {
  const workers = (item.selectedWorkers || []).filter((entry) => entry.worker);
  if (workers.length === 0) return true;
  return getItemWorkerTotalPercentage(item) <= 100.01;
};

export const formatHistoryNote = (note = '') =>
  note
    .replace('waiting_handover', 'Chờ giao xe cho khách hàng')
    .replace('additional_repair', 'Đang sửa bổ sung');

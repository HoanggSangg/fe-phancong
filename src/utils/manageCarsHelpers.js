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

const repairWorkersPayload = (item) => (item.selectedWorkers || [])
  .filter((entry) => entry.worker)
  .map((entry) => ({
    workerId: String(entry.worker._id || entry.worker),
    percentage: Number(entry.percentage) || 0,
  }));

const manualRepairPayload = (item) => ({
  _id: item._id,
  groupName: item.groupName || '',
  content: item.content || '',
  quantity: Number(item.quantity ?? 1),
  unitPrice: Number(item.unitPrice || 0),
  amount: Number(item.amount || 0),
  unitCostPrice: Number(item.unitCostPrice || 0),
  costAmount: Number(item.costAmount || 0),
  unit: item.unit || '',
  workers: repairWorkersPayload(item),
});

const sortedWorkers = (item) => repairWorkersPayload(item)
  .sort((a, b) => a.workerId.localeCompare(b.workerId));

export const buildChangedRepairPayload = (items, initialItems) => {
  const initialById = new Map(initialItems.map((item) => [item._id, item]));
  const assignments = items.filter((item) => !item.isManual && (
    !initialById.has(item._id)
    || JSON.stringify(sortedWorkers(item)) !== JSON.stringify(sortedWorkers(initialById.get(item._id)))
  )).map((item) => ({ itemId: item._id, workers: repairWorkersPayload(item) }));

  const manualSignature = (list) => JSON.stringify(list.filter((item) => item.isManual)
    .map((item) => ({ ...manualRepairPayload(item), workers: sortedWorkers(item) }))
    .sort((a, b) => String(a._id).localeCompare(String(b._id))));
  return {
    assignments,
    ...(manualSignature(items) !== manualSignature(initialItems)
      ? { manualItems: items.filter((item) => item.isManual).map(manualRepairPayload) }
      : {}),
  };
};

export const formatHistoryNote = (note = '') =>
  note
    .replace('waiting_handover', 'Chờ giao xe cho khách hàng')
    .replace('additional_repair', 'Đang sửa bổ sung');

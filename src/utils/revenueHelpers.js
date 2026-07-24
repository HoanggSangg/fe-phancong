export const normalizeRevenueBase = (value) => (value === 'cost' ? 'cost' : 'amount');

export const getItemRevenueBaseAmount = (item = {}, revenueBase = 'amount') => {
  if (normalizeRevenueBase(revenueBase) === 'cost') {
    const costAmount = Number(item.costAmount ?? 0);
    if (costAmount > 0) return costAmount;

    const unitCostPrice = Number(item.unitCostPrice ?? item.raw?.giaVon ?? 0);
    const quantity = Number(item.quantity ?? item.raw?.soLuong ?? 1) || 1;
    return Math.round(unitCostPrice * quantity);
  }

  return Number(item.amount || 0);
};

export const getRevenueBaseLabel = (revenueBase = 'amount') =>
  normalizeRevenueBase(revenueBase) === 'cost' ? 'Giá vốn' : 'Thành tiền';

export const getWorkerRevenuePreview = (repairItems, workersById = {}, revenueBase = 'amount') => {
  const preview = {};

  repairItems.forEach((item) => {
    const baseAmount = getItemRevenueBaseAmount(item, revenueBase);
    (item.selectedWorkers || []).forEach((entry) => {
      if (!entry.worker?._id) return;

      const workerMeta = workersById[entry.worker._id] || entry.worker;
      if (workerMeta.countRevenue === false) return;

      const share = baseAmount * ((Number(entry.percentage) || 0) / 100);
      const key = entry.worker._id;
      preview[key] = {
        id: key,
        name: entry.worker.name,
        total: (preview[key]?.total || 0) + share,
      };
    });
  });

  return Object.values(preview);
};

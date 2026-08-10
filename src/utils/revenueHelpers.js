export const normalizeRevenueBase = (value) => (value === 'cost' ? 'cost' : 'amount');

export const getItemRevenueBaseAmount = (item = {}, revenueBase = 'amount') => {
  if (normalizeRevenueBase(revenueBase) === 'cost') {
    // giaVon API đã là tổng giá vốn — không nhân SL
    if (item.raw?.giaVon != null && item.raw?.giaVon !== '') {
      return Math.round(Number(item.raw.giaVon) || 0);
    }

    const costAmount = Number(item.costAmount ?? 0);
    if (costAmount > 0) return costAmount;

    // Manual: đơn giá × SL
    const unitCostPrice = Number(item.unitCostPrice ?? 0);
    const quantity = Number(item.quantity ?? 1) || 1;
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

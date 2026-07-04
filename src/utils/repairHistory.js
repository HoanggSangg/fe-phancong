export const REPAIR_HISTORY_PAGE_SIZE = 50;

export const parseRepairHistoryResponse = (data) => {
  if (Array.isArray(data)) {
    return {
      items: data,
      summary: {
        totalRevenue: 0,
        revenueBeforeCommission: 0,
        revenueAfterCommission: 0,
        totalItems: data.length,
        totalCars: new Set(data.map((item) => `${item.plateNumber}__${item.carDate}`)).size,
      },
      pagination: null,
    };
  }

  return {
    items: data?.items || [],
    summary: {
      totalRevenue: Number(data?.totalRevenue || data?.revenueAfterCommission || 0),
      revenueBeforeCommission: Number(data?.revenueBeforeCommission || 0),
      revenueAfterCommission: Number(data?.revenueAfterCommission || data?.totalRevenue || 0),
      totalItems: Number(data?.totalItems || data?.items?.length || 0),
      totalCars: Number(data?.totalCars || 0),
    },
    pagination: data?.pagination || null,
  };
};

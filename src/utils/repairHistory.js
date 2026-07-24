export const REPAIR_HISTORY_PAGE_SIZE = 50;

export const getCarKey = (item) => `${item.plateNumber || ''}__${item.carDate || ''}`;

export const parseRepairHistoryResponse = (data) => {
  if (Array.isArray(data)) {
    return {
      items: data,
      summary: {
        totalRevenue: 0,
        revenueBeforeCommission: 0,
        revenueAfterCommission: 0,
        totalItems: data.length,
        totalCars: new Set(data.map(getCarKey)).size,
      },
      pagination: null,
    };
  }

  return {
    items: data?.items || [],
    revenueBase: data?.revenueBase || 'amount',
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

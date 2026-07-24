export const queryKeys = {
  cars: ['cars'],
  carsMine: ['cars', 'mine'],
  carsManageList: (params) => ['cars', 'manage', params],
  locations: ['locations'],
  workers: {
    all: ['workers', 'all'],
    available: ['workers', 'available'],
  },
  supervisors: ['supervisors'],
  repairHistory: (params) => ['repairHistory', params],
  revenueSettings: ['revenueSettings'],
  homeDashboard: ['homeDashboard'],
  overdueCars: ['overdueCars'],
};

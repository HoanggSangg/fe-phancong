export const queryKeys = {
  cars: ['cars'],
  locations: ['locations'],
  workers: {
    all: ['workers', 'all'],
    available: ['workers', 'available'],
  },
  supervisors: ['supervisors'],
  repairHistory: (params) => ['repairHistory', params],
  homeDashboard: ['homeDashboard'],
  overdueCars: ['overdueCars'],
};

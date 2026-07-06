export const queryKeys = {
  cars: ['cars'],
  carsMine: ['cars', 'mine'],
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

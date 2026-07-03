import { api } from './axios';

export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const getUsers = () => api.get('/auth/users');
export const createUser = (data) => api.post('/auth/users', data);
export const updateUser = (id, data) => api.put(`/auth/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/auth/users/${id}`);

export const getAllWorkers = () => api.get('/worker');
export const getWorkerById = (id) => api.get(`/worker/${id}`);
export const createWorker = (data) => api.post('/worker', data);
export const importWorkersBulk = (workers) => api.post('/worker/import', { workers });
export const updateWorker = (id, data) => api.put(`/worker/${id}`, data);
export const toggleWorkerCountRevenue = (id, countRevenue) =>
  api.patch(`/worker/${id}/count-revenue`, { countRevenue });
export const deleteWorker = (id) => api.delete(`/worker/${id}`);
export const getAvailableWorkers = () => api.get('/worker/available');
export const getBusyWorkersWithCars = () => api.get('/worker/busy');
export const lookupCarOrRO = (keyword, plate = '') =>
  api.get(`/external/lookup/${keyword}`, { params: { plate } });
export const getWorkerPerformance = (workerId, from, to) =>
  api.get(`/worker/${workerId}/performance`, { params: { from, to } });
export const getWorkerDailyPerformancePercentage = (workerId, date) =>
  api.get(`/worker/${workerId}/performance/daily`, { params: { date } });
export const searchWorkersByName = (name) => api.get('/worker', { params: { name } });

export const getAllSupervisors = () => api.get('/supervisors');
export const getSupervisorById = (id) => api.get(`/supervisors/${id}`);
export const createSupervisor = (data) => api.post('/supervisors', data);
export const updateSupervisor = (id, data) => api.put(`/supervisors/${id}`, data);
export const deleteSupervisor = (id) => api.delete(`/supervisors/${id}`);

export const getAllCars = () => api.get('/cars');
export const getCarById = (id) => api.get(`/cars/${id}`);
export const createCar = (data) => api.post('/cars', data);
export const updateCar = (id, data) => api.put(`/cars/${id}`, data);
export const deleteCar = (id) => api.delete(`/cars/${id}`);
export const updateCarStatus = (id, status = []) =>
  api.put(`/cars/${id}/status`, { status });
export const updateCarStatusWithWorker = (id, status, newWorkerId = null) =>
  api.put(`/cars/${id}/status`, { status, ...(newWorkerId && { newWorkerId }) });
export const getCarByPlateNumber = (plateNumber) =>
  api.get(`/cars/by-plate/${plateNumber}`);
export const getCarStats = () => api.get('/cars/stats');
export const getWorkingAndPendingCars = () => api.get('/cars/working-pending');
export const getCarsByLocation = (locationId) => api.get(`/cars/by-location/${locationId}`);
export const getOverdueCars = () => api.get('/cars/overdue');
export const getRepairHistory = (params) => api.get('/cars/repair-history', { params });
export const getCarRepairItems = (carId) => api.get(`/cars/${carId}/repair-items`);
export const assignRepairItemWorkers = (carId, assignments) =>
  api.put(`/cars/${carId}/repair-items/assignments`, { assignments });
export const saveManualRepairItems = (carId, items) =>
  api.put(`/cars/${carId}/repair-items/manual`, { items });

export const getAllLocations = () => api.get('/locations');
export const getLocationById = (id) => api.get(`/locations/${id}`);
export const createLocation = (data) => api.post('/locations', data);
export const updateLocation = (id, data) => api.put(`/locations/${id}`, data);
export const deleteLocation = (id) => api.delete(`/locations/${id}`);

export const getCarWorkerHistory = (id) => api.get(`/cars/${id}/workers/history`);

export const getAllWokers = () => api.get('/wokers');
export const getWokerById = (id) => api.get(`/wokers/${id}`);
export const createWoker = (data) => api.post('/wokers/create', data);
export const updateWoker = (id, data) => api.put(`/wokers/${id}`, data);
export const deleteWoker = (id) => api.delete(`/wokers/${id}`);
export const getWorkerRevenueChart = (from, to) =>
  api.get('/worker/revenue/chart', { params: { from, to } });
export const getWokersByDate = (date) => api.get('/wokers/by-date', { params: { date } });
export const getWorkerWeeklyRevenueSummary = (date) =>
  api.get('/worker/revenue/weekly-summary', { params: { date } });

export const getWorkerKpi = (params) => api.get('/worker/kpi', { params });
export const getAllWorkersKpi = (params) => api.get('/worker/kpi/all', { params });

export const getAllTeams = () => api.get('/teams');
export const getTeamById = (teamId) => api.get(`/teams/${teamId}`);
export const createTeam = (data) => api.post('/teams', data);
export const updateTeam = (teamId, data) => api.put(`/teams/${teamId}`, data);
export const deleteTeam = (teamId) => api.delete(`/teams/${teamId}`);
export const addWorkerToTeam = (teamId, workerId) =>
  api.post(`/teams/${teamId}/workers`, { workerId });
export const removeWorkerFromTeam = (teamId, workerId) =>
  api.delete(`/teams/${teamId}/workers/${workerId}`);
export const addManualJobToWorker = (workerId, data) =>
  api.post(`/worker/${workerId}/manual-jobs`, data);
export const removeManualJobFromWorker = (workerId, jobId) =>
  api.delete(`/worker/${workerId}/manual-jobs/${jobId}`);
export const getOperationLogs = (params) => api.get('/audit-logs', { params });

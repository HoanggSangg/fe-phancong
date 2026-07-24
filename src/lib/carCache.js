import { queryClient } from './queryClient';
import { queryKeys } from './queryKeys';

const normalizeId = (value) => String(value?._id || value || '');

const preservePopulatedRef = (prevValue, nextValue) => {
  if (!nextValue) return prevValue;
  if (typeof nextValue === 'object' && nextValue?.name) return nextValue;
  if (typeof prevValue === 'object' && prevValue?.name) return prevValue;
  return nextValue;
};

export const patchCarInCache = (updatedCar) => {
  if (!updatedCar?._id) return;

  queryClient.setQueryData(queryKeys.cars, (old) => {
    if (!Array.isArray(old)) return old;
    const id = normalizeId(updatedCar);
    const exists = old.some((car) => normalizeId(car) === id);
    if (!exists) return [...old, updatedCar];
    return old.map((car) => {
      if (normalizeId(car) !== id) return car;
      return {
        ...car,
        ...updatedCar,
        workers: updatedCar.workers ?? car.workers,
        location: preservePopulatedRef(car.location, updatedCar.location),
        supervisor: preservePopulatedRef(car.supervisor, updatedCar.supervisor),
      };
    });
  });
};

export const removeCarFromCache = (carId) => {
  const id = normalizeId(carId);
  queryClient.setQueryData(queryKeys.cars, (old) => {
    if (!Array.isArray(old)) return old;
    return old.filter((car) => normalizeId(car) !== id);
  });
};

const mergeManageListCar = (car, updatedCar) => ({
  ...car,
  ...updatedCar,
  workers: updatedCar.workers ?? car.workers,
  location: preservePopulatedRef(car.location, updatedCar.location),
  supervisor: preservePopulatedRef(car.supervisor, updatedCar.supervisor),
});

const carMatchesManageListParams = (car, params = {}) => {
  const statusFilter = params.statusFilter || 'not_delivered';

  if (params.plateNumber) return true;

  if (statusFilter === 'delivered') {
    if (car.status !== 'delivered') return false;
    if (params.month) {
      const carMonth = String(car.currentDate || '').slice(0, 7);
      if (carMonth !== params.month) return false;
    }
  } else if (statusFilter === 'not_delivered' && car.status === 'delivered') {
    return false;
  }

  if (params.location && params.location !== 'all') {
    if (normalizeId(car.location) !== normalizeId(params.location)) return false;
  }

  if (params.supervisor && normalizeId(car.supervisor) !== normalizeId(params.supervisor)) {
    return false;
  }

  if (params.date && car.currentDate !== params.date) return false;

  return true;
};

export const patchCarInManageCarsList = (updatedCar) => {
  if (!updatedCar?._id) return;

  const id = normalizeId(updatedCar);

  queryClient.getQueryCache().findAll({ queryKey: ['cars', 'manage'] }).forEach((query) => {
    const params = query.queryKey[2] || {};

    queryClient.setQueryData(query.queryKey, (old) => {
      if (!old?.cars) return old;

      const exists = old.cars.some((car) => normalizeId(car) === id);
      const mergedCars = exists
        ? old.cars.map((car) => (normalizeId(car) === id ? mergeManageListCar(car, updatedCar) : car))
        : old.cars;

      const nextCars = mergedCars.filter((car) => carMatchesManageListParams(car, params));
      const removed = exists && nextCars.length < old.cars.length;

      return {
        ...old,
        cars: nextCars,
        pagination: removed
          ? {
            ...old.pagination,
            total: Math.max(0, (old.pagination?.total || 0) - 1),
          }
          : old.pagination,
      };
    });
  });
};

export const removeCarFromManageCarsList = (carId) => {
  const id = normalizeId(carId);

  queryClient.getQueryCache().findAll({ queryKey: ['cars', 'manage'] }).forEach((query) => {
    queryClient.setQueryData(query.queryKey, (old) => {
      if (!old?.cars) return old;

      const nextCars = old.cars.filter((car) => normalizeId(car) !== id);
      if (nextCars.length === old.cars.length) return old;

      return {
        ...old,
        cars: nextCars,
        pagination: {
          ...old.pagination,
          total: Math.max(0, (old.pagination?.total || 0) - 1),
        },
      };
    });
  });
};

export const invalidateManageCarsList = () => {
  queryClient.invalidateQueries({ queryKey: ['cars', 'manage'] });
};

export const invalidateCarsCache = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.cars });
  queryClient.invalidateQueries({ queryKey: queryKeys.carsMine });
  invalidateManageCarsList();
  queryClient.invalidateQueries({ queryKey: queryKeys.homeDashboard });
  queryClient.invalidateQueries({ queryKey: queryKeys.overdueCars });
  queryClient.invalidateQueries({ queryKey: queryKeys.workers.available });
};

export const invalidateWorkerJobCaches = () => {
  invalidateCarsCache();
  queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.workers.available });
};

export const filterCarsByLocation = (cars = [], locationId = 'all') => {
  if (locationId === 'all') return cars;
  return cars.filter((car) => normalizeId(car.location) === locationId);
};

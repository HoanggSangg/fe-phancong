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

export const invalidateCarsCache = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.cars });
  queryClient.invalidateQueries({ queryKey: queryKeys.carsMine });
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

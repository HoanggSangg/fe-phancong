import { queryClient } from './queryClient';
import { queryKeys } from './queryKeys';

const normalizeId = (value) => String(value?._id || value || '');

export const patchCarInCache = (updatedCar) => {
  if (!updatedCar?._id) return;

  queryClient.setQueryData(queryKeys.cars, (old) => {
    if (!Array.isArray(old)) return old;
    const id = normalizeId(updatedCar);
    const exists = old.some((car) => normalizeId(car) === id);
    if (!exists) return [...old, updatedCar];
    return old.map((car) => (normalizeId(car) === id ? { ...car, ...updatedCar } : car));
  });
};

export const removeCarFromCache = (carId) => {
  const id = normalizeId(carId);
  queryClient.setQueryData(queryKeys.cars, (old) => {
    if (!Array.isArray(old)) return old;
    return old.filter((car) => normalizeId(car) !== id);
  });
};

export const filterCarsByLocation = (cars = [], locationId = 'all') => {
  if (locationId === 'all') return cars;
  return cars.filter((car) => normalizeId(car.location) === locationId);
};

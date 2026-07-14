import dayjs from 'dayjs';

export const normalizePlate = (plate = '') =>
  String(plate || '').trim().toUpperCase().replace(/\s/g, '');

export const normalizeROKey = (roNumber = '', roCode = '') => {
  const number = String(roNumber || '').trim().toUpperCase().replace(/\s/g, '');
  const code = String(roCode || '').trim().toUpperCase().replace(/\s/g, '');
  return number || code || '';
};

export const getCarROKey = (car) =>
  car?.roKey || normalizeROKey(car?.roNumber, car?.roCode);

export const getCarROLabel = (car) =>
  car?.roNumber || car?.roCode || getCarROKey(car) || '';

export const findCarByPlateAndRO = (cars = [], criteria = {}) => {
  const {
    carId = '',
    plateNumber = '',
    roCode = '',
    roNumber = '',
    roKey = '',
  } = criteria;

  const targetPlate = normalizePlate(plateNumber);
  const targetRO = roKey || normalizeROKey(roNumber, roCode);

  if (targetPlate && targetRO) {
    const exactMatch = cars.find(
      (car) =>
        normalizePlate(car.plateNumber) === targetPlate &&
        getCarROKey(car) === targetRO,
    );

    if (exactMatch) return exactMatch;
  }

  if (carId) {
    const byId = cars.find((car) => String(car._id) === String(carId));

    if (byId) {
      const plateMatches = !targetPlate || normalizePlate(byId.plateNumber) === targetPlate;
      const roMatches = !targetRO || getCarROKey(byId) === targetRO;

      if (plateMatches && roMatches) return byId;
    }
  }

  if (targetPlate) {
    const plateMatches = cars.filter(
      (car) => normalizePlate(car.plateNumber) === targetPlate,
    );

    if (targetRO) {
      const roMatch = plateMatches.find((car) => getCarROKey(car) === targetRO);
      if (roMatch) return roMatch;
    }

    if (plateMatches.length === 1) return plateMatches[0];

    if (carId) {
      const byIdInPlate = plateMatches.find((car) => String(car._id) === String(carId));
      if (byIdInPlate) return byIdInPlate;
    }
  }

  if (carId) {
    return cars.find((car) => String(car._id) === String(carId)) || null;
  }

  return null;
};

export const getSupervisorsFromCars = (cars = []) =>
  cars
    .map((car) => car.supervisor)
    .filter(Boolean)
    .filter((v, i, a) => v && a.findIndex((t) => t?._id === v._id) === i);

export const filterDisplayedCars = ({
  cars = [],
  filterDate = null,
  searchPlate = '',
  tableSupervisor = '',
  hideSearch = false,
}) => {
  let filtered = [...cars];

  if (filterDate) {
    const selected = dayjs(filterDate).format('YYYY-MM-DD');
    filtered = filtered.filter((car) => car.currentDate === selected);
  }

  if (!hideSearch) {
    if (searchPlate) {
      const normalizedSearch = normalizePlate(searchPlate);
      filtered = filtered.filter((car) => {
        const normalizedPlate = normalizePlate(car.plateNumber);
        if (!normalizedSearch) return true;
        return normalizedPlate.includes(normalizedSearch);
      });
    }
    if (tableSupervisor) {
      filtered = filtered.filter((car) => car.supervisor?._id === tableSupervisor);
    }
  }

  return filtered.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return dateB - dateA;
  });
};

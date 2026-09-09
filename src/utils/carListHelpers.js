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

export const getLocationsFromCars = (cars = []) =>
  cars
    .map((car) => car.location)
    .filter(Boolean)
    .filter((v, i, a) => v && a.findIndex((t) => t?._id === v._id) === i);

const MONGO_ID_RE = /^[a-f0-9]{24}$/i;
const VN_PLATE_RE = /^\d{2}[A-Z]{1,3}\d{4,6}$/;

const plateKey = (value = '') =>
  String(value || '').toUpperCase().replace(/[\s.\-]/g, '');

const pickPlate = (...candidates) => {
  for (const raw of candidates) {
    const plate = plateKey(raw);
    if (VN_PLATE_RE.test(plate)) return plate;
  }
  return '';
};

const pickMongoId = (...candidates) => {
  for (const raw of candidates) {
    const id = String(raw || '').trim();
    if (MONGO_ID_RE.test(id)) return id;
  }
  return '';
};

/** Biển số / id xe từ một dòng lịch sử thao tác (nếu có). */
export const getCarRefFromOperationLog = (log) => {
  const meta = log?.metadata || {};
  const body = meta.body || {};
  const params = meta.params || {};
  const isCarLog = log?.module === 'car';

  const plateNumber = pickPlate(
    meta.plateNumber,
    body.plateNumber,
    isCarLog ? log.targetLabel : '',
  );

  if (!plateNumber) return null;

  const carId = pickMongoId(
    isCarLog ? log.targetId : '',
    meta.carId,
    isCarLog ? params.id : '',
    log?.module === 'document_image' ? log.targetId : '',
  );

  const roCode = String(body.roCode || meta.roCode || '').trim();
  const roNumber = String(body.roNumber || meta.roNumber || '').trim();

  return {
    carId,
    plateNumber,
    roCode,
    roNumber,
    roKey: String(body.roKey || meta.roKey || '').trim() || normalizeROKey(roNumber, roCode),
  };
};

export const openManageCarsForCar = (navigate, carRef) => {
  if (!navigate || !carRef) return;
  const carId = carRef.carId || carRef._id || '';
  const plateNumber = carRef.plateNumber || '';
  if (!carId && !plateNumber) return;

  const payload = {
    carId,
    plateNumber,
    roCode: carRef.roCode || '',
    roNumber: carRef.roNumber || '',
    roKey: carRef.roKey || normalizeROKey(carRef.roNumber, carRef.roCode),
  };

  try {
    sessionStorage.setItem('ktvTargetCar', JSON.stringify(payload));
  } catch {
    // ignore
  }

  const params = new URLSearchParams();
  params.set('openCar', '1');
  Object.entries(payload).forEach(([key, value]) => {
    if (value) params.set(key, String(value));
  });
  navigate(`/cars/manage?${params.toString()}`);
};


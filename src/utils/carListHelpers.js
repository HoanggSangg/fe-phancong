import dayjs from 'dayjs';

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
      filtered = filtered.filter((car) =>
        car.plateNumber?.toLowerCase().includes(searchPlate.toLowerCase())
      );
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

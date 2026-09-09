import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWorkingAndPendingCars } from '../../components/apis/index';
import { useAuth } from '../../context/AuthContext';
import { queryKeys } from '../../lib/queryKeys';
import { getLocationsFromCars } from '../../utils/carListHelpers';

const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_KEYS = [
  'pending',
  'working',
  'done',
  'waiting_wash',
  'waiting_handover',
  'delivered',
  'additional_repair',
];

const useHomeDashboard = () => {
  const { isAuthenticated, loading } = useAuth();
  const queryClient = useQueryClient();
  const enabled = isAuthenticated && !loading;
  const today = todayISO();

  const carsQuery = useQuery({
    queryKey: [...queryKeys.homeDashboard, 'cars', today],
    queryFn: async () => {
      const res = await getWorkingAndPendingCars(today);
      const payload = res.data || {};
      const overdue = STATUS_KEYS
        .flatMap((key) => payload[key] || [])
        .filter((car) => car.isLate && car.status !== 'delivered')
        .filter((car, index, list) => list.findIndex((item) => item._id === car._id) === index)
        .map((car) => ({ ...car, isLate: true }));
      queryClient.setQueryData(queryKeys.overdueCars, overdue);
      return payload;
    },
    enabled,
    staleTime: 45_000,
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 1;
    },
  });

  const carStatusData = STATUS_KEYS.reduce((acc, key) => {
    acc[key] = carsQuery.data?.[key] || [];
    return acc;
  }, {});

  const todayCars = [];
  Object.values(carStatusData).forEach((cars) => {
    (cars || []).forEach((car) => {
      if (car.currentDate === today) {
        todayCars.push(car);
      }
    });
  });

  const overdueCars = [
    ...todayCars.filter((car) => car.isLate),
    ...Object.values(carStatusData)
      .flat()
      .filter((car) => car.isLate && car.currentDate !== today),
  ].filter((car, index, list) => list.findIndex((item) => item._id === car._id) === index);

  const data = carsQuery.data !== undefined
    ? {
      carsToday: todayCars,
      overdueCars: overdueCars.map((car) => ({ ...car, isLate: true })),
      carsByStatus: carStatusData,
      locations: getLocationsFromCars([...todayCars, ...overdueCars]),
      todayISO: today,
    }
    : undefined;

  return {
    data,
    isLoading: carsQuery.isLoading,
    filtersLoading: false,
    isFetching: carsQuery.isFetching,
  };
};

export default useHomeDashboard;

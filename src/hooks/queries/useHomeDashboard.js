import { useQuery } from '@tanstack/react-query';
import {
  getWorkingAndPendingCars,
  getOverdueCars,
  getAllLocations,
} from '../../components/apis/index';
import { useAuth } from '../../context/AuthContext';
import { queryKeys } from '../../lib/queryKeys';

const todayISO = () => new Date().toISOString().slice(0, 10);

const fetchOverdueCars = async () => {
  try {
    const res = await getOverdueCars();
    return res.data?.cars || [];
  } catch (error) {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      return [];
    }
    throw error;
  }
};

const useHomeDashboard = () => {
  const { isAuthenticated, loading } = useAuth();
  const enabled = isAuthenticated && !loading;
  const today = todayISO();

  const carsQuery = useQuery({
    queryKey: [...queryKeys.homeDashboard, 'cars', today],
    queryFn: async () => {
      const res = await getWorkingAndPendingCars(today);
      return res.data || {};
    },
    enabled,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 1;
    },
  });

  const secondaryEnabled = enabled && carsQuery.isFetched;

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations,
    queryFn: async () => (await getAllLocations()).data || [],
    enabled: secondaryEnabled,
    staleTime: 5 * 60_000,
  });

  const overdueQuery = useQuery({
    queryKey: queryKeys.overdueCars,
    queryFn: fetchOverdueCars,
    enabled: secondaryEnabled,
    staleTime: 30_000,
  });

  const carStatusData = carsQuery.data || {};
  const overdueRaw = overdueQuery.data || [];

  const todayCars = [];
  Object.values(carStatusData).forEach((cars) => {
    (cars || []).forEach((car) => {
      if (car.currentDate === today) {
        todayCars.push(car);
      }
    });
  });

  const overdueIds = new Set(overdueRaw.map((car) => car._id));

  const data = carsQuery.data !== undefined
    ? {
      carsToday: todayCars.map((car) => ({
        ...car,
        isLate: overdueIds.has(car._id),
      })),
      overdueCars: overdueRaw.map((car) => ({
        ...car,
        isLate: true,
      })),
      carsByStatus: carStatusData,
      locations: locationsQuery.data || [],
      todayISO: today,
    }
    : undefined;

  return {
    data,
    isLoading: carsQuery.isLoading,
    filtersLoading: secondaryEnabled && locationsQuery.isLoading,
    isFetching: carsQuery.isFetching || locationsQuery.isFetching || overdueQuery.isFetching,
  };
};

export default useHomeDashboard;

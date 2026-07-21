import { useQuery } from '@tanstack/react-query';
import {
  getWorkingAndPendingCars,
  getOverdueCars,
  getAllLocations,
} from '../../components/apis/index';
import { useAuth } from '../../context/AuthContext';
import { queryClient } from '../../lib/queryClient';
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

const buildHomeDashboard = async () => {
  const today = todayISO();

  const [resWorkingPending, resLocations, overdueRaw] = await Promise.all([
    getWorkingAndPendingCars(today),
    getAllLocations().catch(() => ({ data: [] })),
    queryClient.fetchQuery({
      queryKey: queryKeys.overdueCars,
      queryFn: fetchOverdueCars,
      staleTime: 30_000,
    }),
  ]);

  const carStatusData = resWorkingPending.data || {};
  const todayCars = [];

  Object.values(carStatusData).forEach((cars) => {
    (cars || []).forEach((car) => {
      if (car.currentDate === today) {
        todayCars.push(car);
      }
    });
  });

  const overdueIds = new Set(overdueRaw.map((car) => car._id));

  return {
    carsToday: todayCars.map((car) => ({
      ...car,
      isLate: overdueIds.has(car._id),
    })),
    overdueCars: overdueRaw.map((car) => ({
      ...car,
      isLate: true,
    })),
    carsByStatus: carStatusData,
    locations: resLocations.data || [],
    todayISO: today,
  };
};

const useHomeDashboard = () => {
  const { isAuthenticated, loading } = useAuth();

  return useQuery({
    queryKey: queryKeys.homeDashboard,
    queryFn: buildHomeDashboard,
    enabled: isAuthenticated && !loading,
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
};

export default useHomeDashboard;

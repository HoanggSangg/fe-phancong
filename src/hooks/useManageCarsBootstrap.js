import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAllCars,
  getAllSupervisors,
  getAvailableWorkers,
  getAllLocations,
  getAllWorkers,
} from '../components/apis/index';
import { queryKeys } from '../lib/queryKeys';

const useManageCarsBootstrap = () => {
  const queryClient = useQueryClient();
  const [workers, setWorkers] = useState([]);

  const carsQuery = useQuery({
    queryKey: queryKeys.cars,
    queryFn: async () => (await getAllCars()).data,
    staleTime: 45_000,
  });

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations,
    queryFn: async () => (await getAllLocations()).data,
    staleTime: 5 * 60_000,
  });

  const allWorkersQuery = useQuery({
    queryKey: queryKeys.workers.all,
    queryFn: async () => (await getAllWorkers()).data,
    staleTime: 60_000,
  });

  const availableWorkersQuery = useQuery({
    queryKey: queryKeys.workers.available,
    queryFn: async () => (await getAvailableWorkers()).data,
    staleTime: 30_000,
  });

  const supervisorsQuery = useQuery({
    queryKey: queryKeys.supervisors,
    queryFn: async () => (await getAllSupervisors()).data,
    staleTime: 5 * 60_000,
  });

  const allCars = carsQuery.data || [];

  useEffect(() => {
    if (availableWorkersQuery.data) {
      setWorkers(availableWorkersQuery.data);
    }
  }, [availableWorkersQuery.data]);

  const fetchCars = useCallback(async () => {
    const result = await carsQuery.refetch();
    return result.data;
  }, [carsQuery]);

  const refreshAvailableWorkers = useCallback(async () => {
    const result = await availableWorkersQuery.refetch();
    if (result.data) {
      setWorkers(result.data);
    }
    return result.data;
  }, [availableWorkersQuery]);

  const invalidateHomeDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.homeDashboard });
    queryClient.invalidateQueries({ queryKey: queryKeys.overdueCars });
  }, [queryClient]);

  return {
    allCars,
    workers,
    setWorkers,
    allWorkers: allWorkersQuery.data || [],
    availableWorkers: availableWorkersQuery.data || [],
    supervisors: supervisorsQuery.data || [],
    locations: locationsQuery.data || [],
    fetchCars,
    refreshAvailableWorkers,
    invalidateHomeDashboard,
  };
};

export default useManageCarsBootstrap;

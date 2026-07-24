import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAllSupervisors,
  getAvailableWorkers,
  getAllLocations,
  getAllWorkers,
} from '../components/apis/index';
import { queryKeys } from '../lib/queryKeys';
import { isKtv } from '../utils/permissions';

const useManageCarsBootstrap = (user, { loadFilters = false } = {}) => {
  const queryClient = useQueryClient();
  const [workers, setWorkers] = useState([]);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);
  const isKtvUser = isKtv(user);
  const filtersEnabled = loadFilters && !isKtvUser;

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations,
    queryFn: async () => (await getAllLocations()).data,
    staleTime: 5 * 60_000,
    enabled: filtersEnabled,
  });

  const supervisorsQuery = useQuery({
    queryKey: queryKeys.supervisors,
    queryFn: async () => (await getAllSupervisors()).data,
    staleTime: 5 * 60_000,
    enabled: filtersEnabled,
  });

  const ensureAvailableWorkers = useCallback(async () => {
    if (isKtvUser) return [];

    const data = await queryClient.fetchQuery({
      queryKey: queryKeys.workers.available,
      queryFn: async () => (await getAvailableWorkers()).data,
      staleTime: 30_000,
    });

    setAvailableWorkers(data);
    setWorkers(data);
    return data;
  }, [isKtvUser, queryClient]);

  const ensureAllWorkers = useCallback(async () => {
    if (isKtvUser) return [];

    const data = await queryClient.fetchQuery({
      queryKey: queryKeys.workers.all,
      queryFn: async () => (await getAllWorkers()).data,
      staleTime: 60_000,
    });

    setAllWorkers(data);
    return data;
  }, [isKtvUser, queryClient]);

  const refreshManageCarsList = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['cars', 'manage'] });
  }, [queryClient]);

  const refreshAvailableWorkers = useCallback(async () => {
    if (isKtvUser) return [];
    await queryClient.invalidateQueries({ queryKey: queryKeys.workers.available });
    return ensureAvailableWorkers();
  }, [ensureAvailableWorkers, isKtvUser, queryClient]);

  const invalidateHomeDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.homeDashboard });
    queryClient.invalidateQueries({ queryKey: queryKeys.overdueCars });
  }, [queryClient]);

  return {
    workers,
    setWorkers,
    allWorkers,
    availableWorkers,
    supervisors: supervisorsQuery.data || [],
    locations: locationsQuery.data || [],
    filtersLoading: filtersEnabled && (locationsQuery.isLoading || supervisorsQuery.isLoading),
    ensureAvailableWorkers,
    ensureAllWorkers,
    refreshManageCarsList,
    refreshAvailableWorkers,
    invalidateHomeDashboard,
  };
};

export default useManageCarsBootstrap;

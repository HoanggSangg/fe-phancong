import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAvailableWorkers,
  getAllWorkers,
  getManageCarsFilters,
} from '../components/apis/index';
import { queryKeys } from '../lib/queryKeys';
import { isKtv } from '../utils/permissions';

/**
 * Filters phụ (locations + supervisors) chỉ chạy khi loadFilters=true — 1 API.
 * Workers chỉ fetch khi mở dialog (ensure*).
 */
const useManageCarsBootstrap = (user, { loadFilters = false } = {}) => {
  const queryClient = useQueryClient();
  const [workers, setWorkers] = useState([]);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);
  const isKtvUser = isKtv(user);
  const filtersEnabled = loadFilters && !isKtvUser;

  const filtersQuery = useQuery({
    queryKey: ['cars', 'manage-filters'],
    queryFn: async () => {
      const data = (await getManageCarsFilters()).data || {};
      queryClient.setQueryData(queryKeys.locations, data.locations || []);
      queryClient.setQueryData(queryKeys.supervisors, data.supervisors || []);
      return data;
    },
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
    supervisors: filtersQuery.data?.supervisors || [],
    locations: filtersQuery.data?.locations || [],
    filtersLoading: filtersEnabled && filtersQuery.isLoading,
    ensureAvailableWorkers,
    ensureAllWorkers,
    refreshManageCarsList,
    refreshAvailableWorkers,
    invalidateHomeDashboard,
  };
};

export default useManageCarsBootstrap;

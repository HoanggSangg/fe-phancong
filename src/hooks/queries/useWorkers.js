import { useQuery } from '@tanstack/react-query';
import { getAllWorkers } from '../../components/apis/index';
import { queryKeys } from '../../lib/queryKeys';

const useWorkers = (enabled = true, { teamScope = false } = {}) =>
  useQuery({
    queryKey: [...queryKeys.workers.all, teamScope ? 'team' : 'all'],
    queryFn: async () => {
      const res = await getAllWorkers(teamScope ? { teamScope: 1 } : undefined);
      return res.data || [];
    },
    enabled,
    staleTime: 60_000,
  });

export default useWorkers;

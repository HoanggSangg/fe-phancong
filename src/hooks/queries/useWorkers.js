import { useQuery } from '@tanstack/react-query';
import { getAllWorkers } from '../../components/apis/index';
import { queryKeys } from '../../lib/queryKeys';

const useWorkers = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.workers.all,
    queryFn: async () => {
      const res = await getAllWorkers();
      return res.data || [];
    },
    enabled,
    staleTime: 60_000,
  });

export default useWorkers;

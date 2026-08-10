import { useQuery } from '@tanstack/react-query';
import { getSystemStatus } from '../../components/apis';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Poll /system/status dùng chung (Gate + Notice) — react-query dedupe request.
 */
const useSystemStatus = ({
  enabled = true,
  refetchInterval = 30_000,
} = {}) =>
  useQuery({
    queryKey: queryKeys.systemStatus,
    queryFn: async () => {
      const res = await getSystemStatus();
      return res.data || {};
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: enabled ? refetchInterval : false,
    refetchIntervalInBackground: false,
    retry: 1,
  });

export default useSystemStatus;

import { useQuery } from '@tanstack/react-query';
import { getStoredToken } from '../../components/apis/axios';
import { getOverdueCars } from '../../components/apis/index';
import { queryKeys } from '../../lib/queryKeys';

export const formatOverdueMarqueeLabel = (cars = []) => {
  if (!cars.length) {
    return 'Không có xe trễ hẹn';
  }

  return cars
    .map((car) => {
      const plate = car.plateNumber || '—';
      const ro = car.roNumber || '';
      return ro ? `${plate} · ${ro}` : plate;
    })
    .join('   ◆   ');
};

const useOverdueCarsMarquee = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.overdueCars,
    queryFn: async () => {
      const res = await getOverdueCars();
      return res.data?.cars || [];
    },
    enabled: enabled && !!getStoredToken(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 1;
    },
  });

export default useOverdueCarsMarquee;

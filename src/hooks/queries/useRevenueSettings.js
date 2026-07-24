import { useQuery } from '@tanstack/react-query';
import { getRevenueSettings } from '../../components/apis/index';
import { queryKeys } from '../../lib/queryKeys';
import { normalizeRevenueBase } from '../../utils/revenueHelpers';

export const fetchRevenueSettings = async () => {
  const res = await getRevenueSettings();
  return {
    deductions: res.data?.deductions || [],
    revenueBase: normalizeRevenueBase(res.data?.revenueBase),
  };
};

const useRevenueSettings = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.revenueSettings,
    queryFn: fetchRevenueSettings,
    enabled,
    staleTime: 30_000,
  });

export default useRevenueSettings;

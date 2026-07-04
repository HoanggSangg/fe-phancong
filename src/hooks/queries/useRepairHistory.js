import { useQuery } from '@tanstack/react-query';
import { getRepairHistory } from '../../components/apis/index';
import { queryKeys } from '../../lib/queryKeys';
import {
  parseRepairHistoryResponse,
  REPAIR_HISTORY_PAGE_SIZE,
} from '../../utils/repairHistory';

export const fetchRepairHistoryData = async ({
  from,
  to,
  workerId,
  page,
  limit = REPAIR_HISTORY_PAGE_SIZE,
  paginate = true,
}) => {
  const params = { from, to };
  if (workerId) params.workerId = workerId;
  if (paginate && page) {
    params.page = page;
    params.limit = limit;
  }

  const res = await getRepairHistory(params);
  return parseRepairHistoryResponse(res.data);
};

const useRepairHistory = ({ from, to, workerId, page, enabled = true }) =>
  useQuery({
    queryKey: queryKeys.repairHistory({ from, to, workerId, page }),
    queryFn: () =>
      fetchRepairHistoryData({
        from,
        to,
        workerId,
        page,
        paginate: true,
      }),
    enabled: Boolean(enabled && from && to),
    placeholderData: (previous) => previous,
  });

export default useRepairHistory;

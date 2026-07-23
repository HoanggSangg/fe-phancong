import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getManageCarsList } from '../components/apis/index';
import { queryKeys } from '../lib/queryKeys';
import { isKtv } from '../utils/permissions';

const PAGE_SIZE = 50;

const useManageCarsList = (user, {
  page = 1,
  statusFilter = 'not_delivered',
  filterMonth = '',
  filterDate = null,
  selectedLocation = 'all',
  tableSupervisor = '',
  searchPlate = '',
}) => {
  const isKtvUser = isKtv(user);

  const queryParams = {
    page,
    limit: PAGE_SIZE,
    statusFilter,
    month: statusFilter === 'delivered' ? filterMonth : undefined,
    date: filterDate ? dayjs(filterDate).format('YYYY-MM-DD') : undefined,
    location: selectedLocation,
    supervisor: tableSupervisor || undefined,
    plateNumber: searchPlate || undefined,
    mine: isKtvUser ? '1' : undefined,
  };

  return useQuery({
    queryKey: queryKeys.carsManageList(queryParams),
    queryFn: async () => (await getManageCarsList(queryParams)).data,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });
};

export default useManageCarsList;

import { useEffect, useState } from 'react';
import { getDateRangeForPeriod, getTodayDate } from '../utils/dateFilters';

export const usePeriodFilter = (initialPeriod = 'today', initialDates = null) => {
  const [period, setPeriod] = useState(initialPeriod);
  const [fromDate, setFromDate] = useState(() => initialDates?.from || getTodayDate());
  const [toDate, setToDate] = useState(() => initialDates?.to || getTodayDate());

  useEffect(() => {
    if (period !== 'custom') {
      const range = getDateRangeForPeriod(period);
      setFromDate(range.from);
      setToDate(range.to);
    }
  }, [period]);

  return {
    period,
    setPeriod,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
  };
};

export default usePeriodFilter;

import * as XLSX from 'xlsx';
import { CAR_STATUS_LABELS } from './permissions';

const getCarKey = (item) => `${item.plateNumber || ''}__${item.carDate || ''}`;

const sumItemRevenue = (item) =>
  (item.assignments || []).reduce((sum, a) => sum + Number(a.revenue || 0), 0);

export const sumAssignmentsRevenue = (assignments = []) =>
  assignments.reduce((sum, a) => sum + Number(a.revenue || 0), 0);

export const buildCarGroups = (items = []) => {
  const map = new Map();

  items.forEach((item) => {
    const key = getCarKey(item);
    if (!map.has(key)) {
      map.set(key, {
        key,
        plateNumber: item.plateNumber,
        roNumber: item.roNumber,
        carType: item.carType,
        carDate: item.carDate,
        carStatus: item.carStatus,
        items: [],
        totalAmount: 0,
        totalRevenue: 0,
      });
    }

    const group = map.get(key);
    group.items.push(item);
    group.totalAmount += Number(item.amount || 0);
    group.totalRevenue += sumItemRevenue(item);
  });

  return Array.from(map.values());
};

const formatWorkersCell = (assignments = [], isKtvUser = false) => {
  if (!assignments.length) return 'Chưa phân công';
  return assignments
    .map((a) => {
      const base = `${a.workerName || '—'} (${a.percentage ?? 0}%)`;
      return isKtvUser ? base : `${base} - ${Number(a.revenue || 0)}`;
    })
    .join('; ');
};

const aggregateWorkersForCar = (car, isKtvUser = false) => {
  const workerMap = new Map();

  car.items.forEach((item) => {
    (item.allAssignments || item.assignments || []).forEach((a) => {
      const id = String(a.workerId || a.workerName || '');
      const current = workerMap.get(id) || {
        name: a.workerName || '—',
        percentage: 0,
        revenue: 0,
      };
      workerMap.set(id, {
        name: current.name,
        percentage: current.percentage + Number(a.percentage || 0),
        revenue: current.revenue + Number(a.revenue || 0),
      });
    });
  });

  return [...workerMap.values()]
    .map((w) =>
      isKtvUser
        ? `${w.name} (${w.percentage}%)`
        : `${w.name} (${w.percentage}%) - ${w.revenue}`
    )
    .join('; ');
};

const getStatusLabel = (status) => CAR_STATUS_LABELS[status] || status || '';

export const exportRepairHistoryToExcel = ({
  carGroups = [],
  fromDate,
  toDate,
  includeDeliveredDetails = false,
  isKtvUser = false,
  periodLabel = '',
}) => {
  const headers = isKtvUser
    ? ['Biển số', 'Loại xe', 'Ngày', 'Trạng thái', 'Nhóm', 'Nội dung', 'Thợ thực hiện']
    : [
        'Biển số',
        'Loại xe',
        'Ngày',
        'Trạng thái',
        'Nhóm',
        'Nội dung',
        'Thành tiền',
        'Thợ thực hiện',
        'Doanh thu',
        'Ghi chú',
      ];

  const rows = [headers];

  carGroups.forEach((car) => {
    const statusLabel = getStatusLabel(car.carStatus);
    const isDelivered = car.carStatus === 'delivered';

    if (isDelivered && !includeDeliveredDetails) {
      rows.push(
        isKtvUser
          ? [
              car.plateNumber || '',
              car.carType || '',
              car.carDate || '',
              statusLabel,
              'Tổng hợp',
              `${car.items.length} hạng mục (xe đã giao)`,
              aggregateWorkersForCar(car, true),
            ]
          : [
              car.plateNumber || '',
              car.carType || '',
              car.carDate || '',
              statusLabel,
              'Tổng hợp',
              `${car.items.length} hạng mục (xe đã giao)`,
              Number(car.totalAmount || 0),
              aggregateWorkersForCar(car, false),
              Number(car.totalRevenue || 0),
              'Gom hạng mục',
            ]
      );
      return;
    }

    car.items.forEach((item, index) => {
      const assignments = item.allAssignments || item.assignments || [];
      rows.push(
        isKtvUser
          ? [
              index === 0 ? car.plateNumber || '' : '',
              index === 0 ? car.carType || '' : '',
              index === 0 ? car.carDate || '' : '',
              index === 0 ? statusLabel : '',
              item.groupName || 'Khác',
              item.content || '',
              formatWorkersCell(assignments, true),
            ]
          : [
              index === 0 ? car.plateNumber || '' : '',
              index === 0 ? car.carType || '' : '',
              index === 0 ? car.carDate || '' : '',
              index === 0 ? statusLabel : '',
              item.groupName || 'Khác',
              item.content || '',
              Number(item.amount || 0),
              formatWorkersCell(assignments, false),
              sumAssignmentsRevenue(assignments),
              isDelivered ? 'Chi tiết xe đã giao' : '',
            ]
      );
    });
  });

  const totalRevenue = carGroups.reduce((sum, car) => sum + car.totalRevenue, 0);
  const totalAmount = carGroups.reduce((sum, car) => sum + car.totalAmount, 0);

  rows.push([]);
  rows.push(
    isKtvUser
      ? ['', '', '', '', '', 'TỔNG', `${carGroups.length} xe · ${rows.length - 2} dòng`]
      : [
          '',
          '',
          '',
          '',
          '',
          'TỔNG',
          totalAmount,
          `${carGroups.length} xe`,
          totalRevenue,
          `${fromDate} → ${toDate}`,
        ]
  );

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = isKtvUser
    ? [{ wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 40 }, { wch: 36 }]
    : [
        { wch: 14 },
        { wch: 18 },
        { wch: 12 },
        { wch: 14 },
        { wch: 16 },
        { wch: 40 },
        { wch: 14 },
        { wch: 36 },
        { wch: 14 },
        { wch: 18 },
      ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lich su sua chua');

  const label = periodLabel ? `_${periodLabel}` : '';
  XLSX.writeFile(wb, `lich-su-sua-chua${label}_${fromDate}_${toDate}.xlsx`);
};

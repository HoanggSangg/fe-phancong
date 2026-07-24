import {
  loadWorkbookFromUrl,
  downloadExcelBuffer,
  money,
  applyDataCellStyle,
} from './excelTemplateUtils';
import { CAR_STATUS_LABELS } from './permissions';
import { getItemRevenueBaseAmount, getRevenueBaseLabel } from './revenueHelpers';
import { getCarKey } from './repairHistory';

const ADMIN_TEMPLATE = '/templates/LICH_SU_SUA_CHUA_TEMPLATE.xlsx';
const KTV_TEMPLATE = '/templates/LICH_SU_SUA_CHUA_KTV_TEMPLATE.xlsx';
const DATA_START_ROW = 5; // row 5 = first data style; row 6 alt; row 7 total style

export const sumAssignmentsRevenue = (assignments = []) =>
  assignments.reduce((sum, a) => sum + Number(a.revenue || 0), 0);

export const buildCarGroups = (items = [], revenueBase = 'amount') => {
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
    group.totalAmount += getItemRevenueBaseAmount(item, revenueBase);
    group.totalRevenue += sumAssignmentsRevenue(item.assignments);
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

const buildExportRows = ({
  carGroups,
  includeDeliveredDetails,
  isKtvUser,
  revenueBase,
}) => {
  const rows = [];

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
              money(car.totalAmount),
              aggregateWorkersForCar(car, true),
            ]
          : [
              car.plateNumber || '',
              car.carType || '',
              car.carDate || '',
              statusLabel,
              'Tổng hợp',
              `${car.items.length} hạng mục (xe đã giao)`,
              money(car.totalAmount),
              aggregateWorkersForCar(car, false),
              money(car.totalRevenue),
              'Gom hạng mục',
            ]
      );
      return;
    }

    car.items.forEach((item, index) => {
      const assignments = item.allAssignments || item.assignments || [];
      const itemValue = getItemRevenueBaseAmount(item, revenueBase);
      rows.push(
        isKtvUser
          ? [
              index === 0 ? car.plateNumber || '' : '',
              index === 0 ? car.carType || '' : '',
              index === 0 ? car.carDate || '' : '',
              index === 0 ? statusLabel : '',
              item.groupName || 'Khác',
              item.content || '',
              money(itemValue),
              formatWorkersCell(assignments, true),
            ]
          : [
              index === 0 ? car.plateNumber || '' : '',
              index === 0 ? car.carType || '' : '',
              index === 0 ? car.carDate || '' : '',
              index === 0 ? statusLabel : '',
              item.groupName || 'Khác',
              item.content || '',
              money(itemValue),
              formatWorkersCell(assignments, false),
              sumAssignmentsRevenue(assignments),
              isDelivered ? 'Chi tiết xe đã giao' : '',
            ]
      );
    });
  });

  return rows;
};

const MONEY_COL_ADMIN = new Set([7, 9]);
const MONEY_COL_KTV = new Set([7]);

const fillRow = (excelRow, values, { alt, isTotal, isKtvUser }) => {
  const moneyCols = isKtvUser ? MONEY_COL_KTV : MONEY_COL_ADMIN;
  values.forEach((value, i) => {
    const col = i + 1;
    const cell = excelRow.getCell(col);
    const isMoney = moneyCols.has(col) && typeof value === 'number';
    applyDataCellStyle(cell, { alt, isMoney, isTotal });
    cell.value = value === '' ? null : value;
  });
};

export const exportRepairHistoryToExcel = async ({
  carGroups = [],
  fromDate,
  toDate,
  includeDeliveredDetails = false,
  isKtvUser = false,
  periodLabel = '',
  revenueBase = 'amount',
}) => {
  const templateUrl = isKtvUser ? KTV_TEMPLATE : ADMIN_TEMPLATE;
  const workbook = await loadWorkbookFromUrl(templateUrl);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('Template lịch sử sửa chữa không hợp lệ');

  const valueColumnLabel = getRevenueBaseLabel(revenueBase);
  // Header row 4, cột 7 = Thành tiền / Giá vốn
  worksheet.getCell(4, 7).value = valueColumnLabel;

  worksheet.getCell(1, 1).value = 'LỊCH SỬ SỬA CHỮA — OTO BÁ THÀNH';
  worksheet.getCell(2, 1).value = `Từ ngày ${fromDate} đến ngày ${toDate}${
    periodLabel ? ` · ${periodLabel}` : ''
  }`;

  const dataRows = buildExportRows({
    carGroups,
    includeDeliveredDetails,
    isKtvUser,
    revenueBase,
  });

  // Xóa các dòng mẫu 5–7 trong template rồi ghi data từ row 5
  // (giữ style bằng applyDataCellStyle)
  const colCount = isKtvUser ? 8 : 10;

  dataRows.forEach((values, index) => {
    const rowNum = DATA_START_ROW + index;
    const excelRow = worksheet.getRow(rowNum);
    excelRow.height = 20;
    fillRow(excelRow, values, {
      alt: index % 2 === 1,
      isTotal: false,
      isKtvUser,
    });
    excelRow.commit();
  });

  const totalAmount = carGroups.reduce((sum, car) => sum + car.totalAmount, 0);
  const totalRevenue = carGroups.reduce((sum, car) => sum + car.totalRevenue, 0);
  const totalRowNum = DATA_START_ROW + dataRows.length;
  const totalValues = isKtvUser
    ? ['', '', '', '', '', 'TỔNG', money(totalAmount), `${carGroups.length} xe`]
    : [
        '',
        '',
        '',
        '',
        '',
        'TỔNG',
        money(totalAmount),
        `${carGroups.length} xe`,
        money(totalRevenue),
        `${fromDate} → ${toDate}`,
      ];

  const totalRow = worksheet.getRow(totalRowNum);
  totalRow.height = 22;
  fillRow(totalRow, totalValues, { alt: false, isTotal: true, isKtvUser });
  // clear unused sample rows below if template had extras
  for (let r = totalRowNum + 1; r <= totalRowNum + 3; r += 1) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= colCount; c += 1) {
      row.getCell(c).value = null;
    }
  }

  worksheet.name = 'Lich su sua chua';

  const buffer = await workbook.xlsx.writeBuffer();
  const label = periodLabel ? `_${periodLabel}` : '';
  const filename = `LICH_SU_SUA_CHUA${label}_${fromDate}_${toDate}.xlsx`;
  downloadExcelBuffer(buffer, filename);
  return filename;
};

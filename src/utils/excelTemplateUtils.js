import ExcelJS from 'exceljs';

/** Brand Bá Thành */
export const EXCEL_BRAND = {
  primary: 'FFB71C1C',
  primaryDark: 'FF7F0000',
  headerBg: 'FFB71C1C',
  headerFg: 'FFFFFFFF',
  titleBg: 'FF1E293B',
  titleFg: 'FFFFFFFF',
  subBg: 'FFF1F5F9',
  subFg: 'FF334155',
  altRow: 'FFF8FAFC',
  border: 'FFCBD5E1',
  totalBg: 'FFFEF3C7',
  totalFg: 'FF92400E',
  moneyFg: 'FF0F766E',
};

export const thinBorder = {
  top: { style: 'thin', color: { argb: EXCEL_BRAND.border } },
  left: { style: 'thin', color: { argb: EXCEL_BRAND.border } },
  bottom: { style: 'thin', color: { argb: EXCEL_BRAND.border } },
  right: { style: 'thin', color: { argb: EXCEL_BRAND.border } },
};

export const money = (v) => Math.round(Number(v) || 0);

export const downloadExcelBuffer = (buffer, filename) => {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const loadWorkbookFromUrl = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Không tải được file mẫu: ${url}`);
  }
  const buffer = await res.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
};

export const applyTitleStyle = (cell) => {
  cell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: EXCEL_BRAND.titleFg } };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: EXCEL_BRAND.primary },
  };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
};

export const applySubTitleStyle = (cell) => {
  cell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: EXCEL_BRAND.subFg } };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: EXCEL_BRAND.subBg },
  };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
};

export const applyHeaderCellStyle = (cell) => {
  cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_BRAND.headerFg } };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: EXCEL_BRAND.headerBg },
  };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = thinBorder;
};

export const applyDataCellStyle = (cell, { alt = false, isMoney = false, isTotal = false } = {}) => {
  cell.font = {
    name: 'Calibri',
    size: 10,
    bold: isTotal,
    color: { argb: isTotal ? EXCEL_BRAND.totalFg : isMoney ? EXCEL_BRAND.moneyFg : 'FF0F172A' },
  };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: isTotal ? EXCEL_BRAND.totalBg : alt ? EXCEL_BRAND.altRow : 'FFFFFFFF' },
  };
  cell.alignment = {
    vertical: 'middle',
    horizontal: isMoney ? 'right' : 'left',
    wrapText: true,
  };
  cell.border = thinBorder;
  if (isMoney) cell.numFmt = '#,##0';
};

export const cloneRowStyle = (templateRow, destRow, colCount) => {
  destRow.height = templateRow.height || 20;
  for (let col = 1; col <= colCount; col += 1) {
    const src = templateRow.getCell(col);
    const dest = destRow.getCell(col);
    if (src.style) {
      try {
        dest.style = JSON.parse(JSON.stringify(src.style));
      } catch {
        /* ignore */
      }
    }
    if (src.numFmt) dest.numFmt = src.numFmt;
  }
};

export { ExcelJS };

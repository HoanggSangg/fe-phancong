/**
 * Tạo các file Excel mẫu chỉnh chu vào public/templates/
 * Chạy: node scripts/build-excel-templates.cjs
 */
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'public', 'templates');

const BRAND = {
  primary: 'FFB71C1C',
  headerFg: 'FFFFFFFF',
  subBg: 'FFF1F5F9',
  subFg: 'FF334155',
  altRow: 'FFF8FAFC',
  border: 'FFCBD5E1',
  totalBg: 'FFFEF3C7',
  totalFg: 'FF92400E',
};

const thinBorder = {
  top: { style: 'thin', color: { argb: BRAND.border } },
  left: { style: 'thin', color: { argb: BRAND.border } },
  bottom: { style: 'thin', color: { argb: BRAND.border } },
  right: { style: 'thin', color: { argb: BRAND.border } },
};

const paint = (cell, { fill, font, align, border, numFmt } = {}) => {
  if (fill) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  }
  if (font) cell.font = font;
  if (align) cell.alignment = align;
  if (border) cell.border = border;
  if (numFmt) cell.numFmt = numFmt;
};

async function buildRepairHistoryTemplate(filename, columns, title) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Oto Ba Thanh';
  wb.created = new Date();

  const ws = wb.addWorksheet('Lich su sua chua', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
    properties: { defaultRowHeight: 18 },
  });

  const colCount = columns.length;

  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
  });

  // Row 1 — title
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  paint(titleCell, {
    fill: BRAND.primary,
    font: { name: 'Calibri', size: 16, bold: true, color: { argb: BRAND.headerFg } },
    align: { vertical: 'middle', horizontal: 'center' },
  });
  ws.getRow(1).height = 32;

  // Row 2 — subtitle / period placeholder
  ws.mergeCells(2, 1, 2, colCount);
  const sub = ws.getCell(2, 1);
  sub.value = 'Từ ngày {{FROM}} đến ngày {{TO}}';
  paint(sub, {
    fill: BRAND.subBg,
    font: { name: 'Calibri', size: 11, italic: true, color: { argb: BRAND.subFg } },
    align: { vertical: 'middle', horizontal: 'center' },
  });
  ws.getRow(2).height = 22;

  // Row 3 — meta
  ws.mergeCells(3, 1, 3, colCount);
  const meta = ws.getCell(3, 1);
  meta.value = 'Hệ thống phân công Oto Bá Thành';
  paint(meta, {
    fill: 'FFFFFFFF',
    font: { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } },
    align: { vertical: 'middle', horizontal: 'left' },
  });
  ws.getRow(3).height = 18;

  // Row 4 — headers
  const headerRow = ws.getRow(4);
  headerRow.height = 28;
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.label;
    paint(cell, {
      fill: BRAND.primary,
      font: { name: 'Calibri', size: 11, bold: true, color: { argb: BRAND.headerFg } },
      align: { vertical: 'middle', horizontal: 'center', wrapText: true },
      border: thinBorder,
    });
  });

  // Row 5 — style sample data row (empty)
  const sample = ws.getRow(5);
  sample.height = 20;
  columns.forEach((col, i) => {
    const cell = sample.getCell(i + 1);
    paint(cell, {
      fill: 'FFFFFFFF',
      font: { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } },
      align: {
        vertical: 'middle',
        horizontal: col.money ? 'right' : 'left',
        wrapText: true,
      },
      border: thinBorder,
      numFmt: col.money ? '#,##0' : undefined,
    });
    cell.value = null;
  });

  // Row 6 — alt row style sample
  const alt = ws.getRow(6);
  alt.height = 20;
  columns.forEach((col, i) => {
    const cell = alt.getCell(i + 1);
    paint(cell, {
      fill: BRAND.altRow,
      font: { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } },
      align: {
        vertical: 'middle',
        horizontal: col.money ? 'right' : 'left',
        wrapText: true,
      },
      border: thinBorder,
      numFmt: col.money ? '#,##0' : undefined,
    });
    cell.value = null;
  });

  // Row 7 — total style sample
  const total = ws.getRow(7);
  total.height = 22;
  columns.forEach((col, i) => {
    const cell = total.getCell(i + 1);
    paint(cell, {
      fill: BRAND.totalBg,
      font: { name: 'Calibri', size: 10, bold: true, color: { argb: BRAND.totalFg } },
      align: {
        vertical: 'middle',
        horizontal: col.money ? 'right' : 'left',
        wrapText: true,
      },
      border: thinBorder,
      numFmt: col.money ? '#,##0' : undefined,
    });
    cell.value = null;
  });

  const out = path.join(OUT_DIR, filename);
  await wb.xlsx.writeFile(out);
  console.log('Wrote', out);
}

async function polishPayrollTemplate() {
  const file = path.join(OUT_DIR, 'BANG_TINH_LUONG_TEMPLATE.xlsx');
  if (!fs.existsSync(file)) {
    console.log('Skip payroll polish — template missing');
    return;
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];

  // Enhance title row
  const titleCell = ws.getCell(2, 5);
  if (titleCell) {
    titleCell.font = {
      name: 'Calibri',
      size: 16,
      bold: true,
      color: { argb: BRAND.headerFg },
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: BRAND.primary },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  }
  ws.getRow(2).height = Math.max(ws.getRow(2).height || 0, 30);

  // Header rows 3-5: ensure brand red on key labels where empty fill
  for (let r = 3; r <= 5; r++) {
    const row = ws.getRow(r);
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (!cell.value) return;
      // keep existing fills if already colored; boost font
      cell.font = {
        ...(cell.font || {}),
        name: 'Calibri',
        bold: true,
        size: cell.font?.size || 9,
      };
      cell.alignment = {
        ...(cell.alignment || {}),
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.border = thinBorder;
    });
  }

  await wb.xlsx.writeFile(file);
  console.log('Polished', file);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const adminCols = [
    { label: 'Biển số', width: 14 },
    { label: 'Loại xe', width: 16 },
    { label: 'Ngày', width: 12 },
    { label: 'Trạng thái', width: 14 },
    { label: 'Nhóm', width: 16 },
    { label: 'Nội dung', width: 42 },
    { label: 'Thành tiền', width: 14, money: true },
    { label: 'Thợ thực hiện', width: 36 },
    { label: 'Doanh thu', width: 14, money: true },
    { label: 'Ghi chú', width: 18 },
  ];

  const ktvCols = [
    { label: 'Biển số', width: 14 },
    { label: 'Loại xe', width: 16 },
    { label: 'Ngày', width: 12 },
    { label: 'Trạng thái', width: 14 },
    { label: 'Nhóm', width: 16 },
    { label: 'Nội dung', width: 42 },
    { label: 'Thành tiền', width: 14, money: true },
    { label: 'Thợ thực hiện', width: 36 },
  ];

  await buildRepairHistoryTemplate(
    'LICH_SU_SUA_CHUA_TEMPLATE.xlsx',
    adminCols,
    'LỊCH SỬ SỬA CHỮA — OTO BÁ THÀNH'
  );
  await buildRepairHistoryTemplate(
    'LICH_SU_SUA_CHUA_KTV_TEMPLATE.xlsx',
    ktvCols,
    'LỊCH SỬ SỬA CHỮA — OTO BÁ THÀNH'
  );

  // Mẫu import thợ (để tải về điền)
  {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Import tho', {
      views: [{ state: 'frozen', ySplit: 2, showGridLines: false }],
    });
    ws.getColumn(1).width = 8;
    ws.getColumn(2).width = 28;
    ws.getColumn(3).width = 16;
    ws.getColumn(4).width = 18;

    ws.mergeCells(1, 1, 1, 4);
    const t = ws.getCell(1, 1);
    t.value = 'MẪU IMPORT DANH SÁCH THỢ — OTO BÁ THÀNH';
    paint(t, {
      fill: BRAND.primary,
      font: { name: 'Calibri', size: 14, bold: true, color: { argb: BRAND.headerFg } },
      align: { vertical: 'middle', horizontal: 'center' },
    });
    ws.getRow(1).height = 28;

    const headers = ['STT', 'Họ và tên', 'Số báo danh', 'Tên tổ (tuỳ chọn)'];
    headers.forEach((h, i) => {
      const cell = ws.getRow(2).getCell(i + 1);
      cell.value = h;
      paint(cell, {
        fill: BRAND.primary,
        font: { name: 'Calibri', size: 11, bold: true, color: { argb: BRAND.headerFg } },
        align: { vertical: 'middle', horizontal: 'center' },
        border: thinBorder,
      });
    });
    ws.getRow(2).height = 24;

    // example rows
    const examples = [
      [1, 'Nguyễn Văn A', 'A001', 'Tổ SCC'],
      [2, 'Trần Văn B', 'B002', ''],
    ];
    examples.forEach((vals, idx) => {
      const row = ws.getRow(3 + idx);
      vals.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v;
        paint(cell, {
          fill: idx % 2 ? BRAND.altRow : 'FFFFFFFF',
          font: { name: 'Calibri', size: 10 },
          align: { vertical: 'middle', horizontal: i === 0 ? 'center' : 'left' },
          border: thinBorder,
        });
      });
    });

    // note
    ws.mergeCells(6, 1, 6, 4);
    const note = ws.getCell(6, 1);
    note.value =
      'Hướng dẫn: giữ nguyên dòng tiêu đề. Cột Họ và tên + Số báo danh bắt buộc. Xóa dòng ví dụ trước khi import.';
    paint(note, {
      fill: BRAND.subBg,
      font: { name: 'Calibri', size: 9, italic: true, color: { argb: BRAND.subFg } },
      align: { vertical: 'middle', wrapText: true },
    });
    ws.getRow(6).height = 32;

    const out = path.join(OUT_DIR, 'MAU_IMPORT_THO.xlsx');
    await wb.xlsx.writeFile(out);
    console.log('Wrote', out);
  }

  await polishPayrollTemplate();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import ExcelJS from 'exceljs';
import { formatMoney } from './dateFilters';

const moneyNum = (v) => Math.round(Number(v) || 0);

const COLS = [
  { header: 'STT', key: 'stt', width: 6 },
  { header: 'Bộ phận', key: 'boPhan', width: 16 },
  { header: 'Họ tên', key: 'name', width: 22 },
  { header: 'Chức vụ', key: 'chucVu', width: 10 },
  { header: 'Lương cơ bản', key: 'luongCoBan', width: 14 },
  { header: 'Ngày công chuẩn', key: 'ngayCongChuan', width: 12 },
  { header: 'Ngày công thực tế', key: 'ngayCongThucTe', width: 12 },
  { header: 'Nghỉ không lương', key: 'ngayNghiKhongLuong', width: 12 },
  { header: 'Nghỉ có lương', key: 'ngayNghiCoLuong', width: 12 },
  { header: 'Số buổi nghỉ', key: 'soBuoiNghi', width: 10 },
  { header: 'Tổng giờ thiếu', key: 'tongGioThieu', width: 12 },
  { header: 'Lương ngày', key: 'luongNgay', width: 12 },
  { header: 'Lương giờ', key: 'luongGio', width: 12 },
  { header: 'Tiền trừ ngày công', key: 'tienTruNgayCong', width: 14 },
  { header: 'Lương còn lại theo công', key: 'luongTheoNgayCong', width: 16 },
  { header: 'Phụ cấp', key: 'phuCap', width: 12 },
  { header: 'Thưởng', key: 'thuong', width: 12 },
  { header: 'Tăng ca', key: 'tangCa', width: 12 },
  { header: 'Hỗ trợ', key: 'hoTro', width: 12 },
  { header: 'Bảo hiểm', key: 'baoHiem', width: 12 },
  { header: 'Phạt', key: 'phat', width: 12 },
  { header: 'Thuế', key: 'thue', width: 12 },
  { header: 'Tạm ứng', key: 'tamUng', width: 12 },
  { header: 'Khấu trừ khác', key: 'khauTruKhac', width: 12 },
  { header: 'Tổng thu nhập', key: 'tongThuNhap', width: 14 },
  { header: 'Tổng khấu trừ', key: 'tongKhauTru', width: 14 },
  { header: 'Lương thực nhận', key: 'luongThucNhan', width: 14 },
];

const MONEY_KEYS = new Set([
  'luongCoBan', 'luongNgay', 'luongGio', 'tienTruNgayCong', 'luongTheoNgayCong',
  'phuCap', 'thuong', 'tangCa', 'hoTro', 'baoHiem', 'phat', 'thue', 'tamUng',
  'khauTruKhac', 'tongThuNhap', 'tongKhauTru', 'luongThucNhan',
]);

export const exportDayWorkPayrollToExcel = async ({ year, month, rows = [], totals = {} }) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`Lương T${month}-${year}`, {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  sheet.mergeCells(1, 1, 1, COLS.length);
  const title = sheet.getCell(1, 1);
  title.value = `BẢNG LƯƠNG THEO NGÀY CÔNG — THÁNG ${month}/${year}`;
  title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, COLS.length);
  sheet.getCell(2, 1).value = 'Module lương ngày công (không tính theo doanh thu / LNS)';
  sheet.getCell(2, 1).font = { italic: true, size: 10, color: { argb: 'FF64748B' } };

  const headerRow = sheet.getRow(3);
  COLS.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF134E4A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F766E' } },
      left: { style: 'thin', color: { argb: 'FF0F766E' } },
      bottom: { style: 'thin', color: { argb: 'FF0F766E' } },
      right: { style: 'thin', color: { argb: 'FF0F766E' } },
    };
    sheet.getColumn(idx + 1).width = col.width;
  });
  headerRow.height = 32;

  rows.forEach((row, index) => {
    const c = row.computed || {};
    const excelRow = sheet.addRow(
      COLS.map((col) => {
        if (col.key === 'stt') return index + 1;
        if (col.key === 'boPhan') return row.boPhan || '';
        if (col.key === 'name') return row.name || '';
        if (col.key === 'chucVu') return row.chucVu || '';
        return c[col.key] ?? row[col.key] ?? 0;
      })
    );

    excelRow.eachCell((cell, colNumber) => {
      const key = COLS[colNumber - 1].key;
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
      if (MONEY_KEYS.has(key)) {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right' };
      }
      if (key === 'luongThucNhan') {
        cell.font = { bold: true, color: { argb: 'FF047857' } };
      }
    });
  });

  const totalRow = sheet.addRow(
    COLS.map((col) => {
      if (col.key === 'stt') return '';
      if (col.key === 'name') return 'TỔNG CỘNG';
      if (['boPhan', 'chucVu'].includes(col.key)) return '';
      if (['ngayCongChuan', 'ngayCongThucTe', 'ngayNghiKhongLuong', 'ngayNghiCoLuong', 'soBuoiNghi', 'tongGioThieu', 'luongNgay', 'luongGio'].includes(col.key)) {
        return '';
      }
      return moneyNum(totals[col.key]);
    })
  );
  totalRow.eachCell((cell, colNumber) => {
    const key = COLS[colNumber - 1].key;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F766E' } },
      left: { style: 'thin', color: { argb: 'FF0F766E' } },
      bottom: { style: 'medium', color: { argb: 'FF0F766E' } },
      right: { style: 'thin', color: { argb: 'FF0F766E' } },
    };
    if (MONEY_KEYS.has(key)) cell.numFmt = '#,##0';
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BANG_LUONG_NGAY_CONG_THANG_${String(month).padStart(2, '0')}_${year}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  return { fileName: a.download, totalsLabel: formatMoney(totals.luongThucNhan) };
};

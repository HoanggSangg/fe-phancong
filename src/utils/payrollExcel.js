import ExcelJS from 'exceljs';
import { downloadExcelBuffer, money } from './excelTemplateUtils';

const TEMPLATE_URL = '/templates/BANG_TINH_LUONG_TEMPLATE.xlsx';
const DATA_START_ROW = 6;
const COL_COUNT = 49; // đã bỏ cột "Lương ngày 20 tháng 2"

const c = (row, key) => money(row?.computed?.[key] ?? row?.[key]);

/**
 * Map 1 dòng lương → cột Excel mẫu (sau khi xóa cột "Lương ngày").
 * A=STT … AW=Thực nhận (49 cột).
 */
const mapRowToColumns = (row, index) => {
  const cols = {};
  cols[1] = index + 1;
  cols[2] = row.boPhan || '';
  cols[3] = row.name || '';
  cols[4] = row.chucVu || '';
  cols[5] = money(row.luongCoBan);
  cols[6] = money(row.doanhThuDinhMuc);
  cols[7] = 0; // DT Đồng/Sơn
  cols[8] = money(row.doanhThuThang);
  cols[9] = Number(row.soCongHoTro) || 0;
  cols[10] = c(row, 'tienCongHoTro');
  cols[11] = c(row, 'tongDoanhThu');
  cols[12] = c(row, 'dtDatDinhMuc');
  cols[13] = c(row, 'dtVuotDinhMuc');
  cols[14] = c(row, 'tienNsDat');
  cols[15] = c(row, 'tienNsVuot');
  cols[16] = money(row.phuCapTrachNhiem);
  cols[17] = money(row.thuongSoLuongXe);
  cols[18] = money(row.phuCapDienThoai);
  cols[19] = money(row.phuCapXangXe);
  cols[20] = money(row.phuCapChuyenCan);
  cols[21] = money(row.phuCapBaoCaoNgay);
  cols[22] = money(row.phuCapBaoVeTaiSan);
  cols[23] = money(row.phuCapVeSinh);
  cols[24] = money(row.phuCapTayNghe);
  cols[25] = 0; // số ngày ăn trưa
  cols[26] = money(row.tienComTrua);
  cols[27] = money(row.tienTangCa);
  cols[28] = money(row.congTacXa);
  cols[29] = money(row.hoTroBaoGiaThau);
  cols[30] = money(row.hoTroSuaChuaLai);
  cols[31] = money(row.hoTroCongViecDacBiet) + money(row.tienHoTroKhac);
  cols[32] = money(row.tienCuuPan) + money(row.tienThuongKhac);
  cols[33] = c(row, 'luongNangSuat');
  cols[34] = c(row, 'tongThuNhap');
  cols[35] = money(row.truThieuTrachNhiem);
  cols[36] = money(row.truChatLuong);
  cols[37] = money(row.truHuHong);
  cols[38] = money(row.truViPhamNoiQuy);
  cols[39] = money(row.truThueTNCN);
  cols[40] = c(row, 'tongThuNhap');
  cols[41] = money(row.truNghiVuotPhep);
  cols[42] = money(row.truTamUng);
  cols[43] = money(row.truCongNo) + money(row.truKhac);
  cols[44] = c(row, 'bhxh');
  cols[45] = c(row, 'bhyt');
  cols[46] = c(row, 'bhtn');
  cols[47] = c(row, 'tongBaoHiem');
  cols[48] = 0;
  cols[49] = c(row, 'luongThucNhan');
  return cols;
};

const MONEY_COLS = new Set([
  5, 6, 7, 8, 10, 11, 12, 13, 14, 15,
  16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 32,
  33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
]);

const cloneRowStyle = (templateRow, destRow) => {
  destRow.height = templateRow.height || 18;
  for (let col = 1; col <= COL_COUNT; col += 1) {
    const src = templateRow.getCell(col);
    const dest = destRow.getCell(col);
    if (src.style) {
      dest.style = JSON.parse(JSON.stringify(src.style));
    }
    if (src.numFmt) dest.numFmt = src.numFmt;
    else if (MONEY_COLS.has(col)) dest.numFmt = '#,##0';
  }
};

const setCellValue = (row, col, value) => {
  const cell = row.getCell(col);
  if (value === null || value === undefined || value === '') {
    cell.value = null;
    return;
  }
  if (typeof value === 'number') {
    cell.value = value;
    if (MONEY_COLS.has(col) && !cell.numFmt) cell.numFmt = '#,##0';
    return;
  }
  cell.value = value;
};

const downloadBuffer = downloadExcelBuffer;

export const exportPayrollToExcel = async ({ year, month, rows = [] }) => {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) {
    throw new Error('Không tải được file Excel mẫu. Kiểm tra public/templates/BANG_TINH_LUONG_TEMPLATE.xlsx');
  }

  const buffer = await res.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('Template Excel không có sheet');

  const title = `BẢNG TÍNH LƯƠNG THÁNG ${String(month).padStart(2, '0')}/${year}`;
  // Tiêu đề nằm vùng cột 5 (sau khi đã xóa cột Lương ngày)
  worksheet.getCell(2, 5).value = title;

  const styleRow = worksheet.getRow(DATA_START_ROW);

  rows.forEach((row, index) => {
    const excelRowNum = DATA_START_ROW + index;
    const destRow = worksheet.getRow(excelRowNum);
    cloneRowStyle(styleRow, destRow);

    const cols = mapRowToColumns(row, index);
    Object.entries(cols).forEach(([col, value]) => {
      setCellValue(destRow, Number(col), value);
    });
    destRow.commit();
  });

  if (rows.length) {
    const totalRowNum = DATA_START_ROW + rows.length;
    const totalRow = worksheet.getRow(totalRowNum);
    cloneRowStyle(styleRow, totalRow);

    const sumCol = (getter) => rows.reduce((s, r) => s + money(getter(r)), 0);

    setCellValue(totalRow, 3, 'TỔNG CỘNG');
    setCellValue(totalRow, 5, sumCol((r) => r.luongCoBan));
    setCellValue(totalRow, 6, sumCol((r) => r.doanhThuDinhMuc));
    setCellValue(totalRow, 8, sumCol((r) => r.doanhThuThang));
    setCellValue(totalRow, 9, sumCol((r) => r.soCongHoTro));
    setCellValue(totalRow, 10, sumCol((r) => r.computed?.tienCongHoTro));
    setCellValue(totalRow, 11, sumCol((r) => r.computed?.tongDoanhThu));
    setCellValue(totalRow, 12, sumCol((r) => r.computed?.dtDatDinhMuc));
    setCellValue(totalRow, 13, sumCol((r) => r.computed?.dtVuotDinhMuc));
    setCellValue(totalRow, 14, sumCol((r) => r.computed?.tienNsDat));
    setCellValue(totalRow, 15, sumCol((r) => r.computed?.tienNsVuot));
    setCellValue(totalRow, 16, sumCol((r) => r.phuCapTrachNhiem));
    setCellValue(totalRow, 17, sumCol((r) => r.thuongSoLuongXe));
    setCellValue(totalRow, 18, sumCol((r) => r.phuCapDienThoai));
    setCellValue(totalRow, 19, sumCol((r) => r.phuCapXangXe));
    setCellValue(totalRow, 20, sumCol((r) => r.phuCapChuyenCan));
    setCellValue(totalRow, 21, sumCol((r) => r.phuCapBaoCaoNgay));
    setCellValue(totalRow, 22, sumCol((r) => r.phuCapBaoVeTaiSan));
    setCellValue(totalRow, 23, sumCol((r) => r.phuCapVeSinh));
    setCellValue(totalRow, 24, sumCol((r) => r.phuCapTayNghe));
    setCellValue(totalRow, 26, sumCol((r) => r.tienComTrua));
    setCellValue(totalRow, 27, sumCol((r) => r.tienTangCa));
    setCellValue(totalRow, 28, sumCol((r) => r.congTacXa));
    setCellValue(totalRow, 29, sumCol((r) => r.hoTroBaoGiaThau));
    setCellValue(totalRow, 30, sumCol((r) => r.hoTroSuaChuaLai));
    setCellValue(totalRow, 31, sumCol((r) => (r.hoTroCongViecDacBiet || 0) + (r.tienHoTroKhac || 0)));
    setCellValue(totalRow, 32, sumCol((r) => (r.tienCuuPan || 0) + (r.tienThuongKhac || 0)));
    setCellValue(totalRow, 33, sumCol((r) => r.computed?.luongNangSuat));
    setCellValue(totalRow, 34, sumCol((r) => r.computed?.tongThuNhap));
    setCellValue(totalRow, 35, sumCol((r) => r.truThieuTrachNhiem));
    setCellValue(totalRow, 36, sumCol((r) => r.truChatLuong));
    setCellValue(totalRow, 37, sumCol((r) => r.truHuHong));
    setCellValue(totalRow, 38, sumCol((r) => r.truViPhamNoiQuy));
    setCellValue(totalRow, 39, sumCol((r) => r.truThueTNCN));
    setCellValue(totalRow, 40, sumCol((r) => r.computed?.tongThuNhap));
    setCellValue(totalRow, 41, sumCol((r) => r.truNghiVuotPhep));
    setCellValue(totalRow, 42, sumCol((r) => r.truTamUng));
    setCellValue(totalRow, 43, sumCol((r) => (r.truCongNo || 0) + (r.truKhac || 0)));
    setCellValue(totalRow, 44, sumCol((r) => r.computed?.bhxh));
    setCellValue(totalRow, 45, sumCol((r) => r.computed?.bhyt));
    setCellValue(totalRow, 46, sumCol((r) => r.computed?.bhtn));
    setCellValue(totalRow, 47, sumCol((r) => r.computed?.tongBaoHiem));
    setCellValue(totalRow, 49, sumCol((r) => r.computed?.luongThucNhan));
    totalRow.commit();
  }

  worksheet.name = `LNS T${String(month).padStart(2, '0')}-${year}`.slice(0, 31);

  const outBuffer = await workbook.xlsx.writeBuffer();
  const filename = `BANG_TINH_LUONG_THANG_${String(month).padStart(2, '0')}_${year}.xlsx`;
  downloadBuffer(outBuffer, filename);
  return filename;
};

export default exportPayrollToExcel;

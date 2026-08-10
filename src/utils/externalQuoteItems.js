/** Flag checkbox API (huy / ghiThem…): 1 | true | '1' | 'true' */
export const isExternalFlagOn = (value) => {
  if (value === 1 || value === true) return true;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'x';
  }
  return false;
};

/**
 * Dòng chi tiết không đưa vào báo giá:
 * - Hủy (`huy`)
 * - Ghi thêm (`isGhiThem` từ API OtoBaThanh)
 */
export const isExcludedQuoteLine = (item = {}) =>
  isExternalFlagOn(item.huy)
  || isExternalFlagOn(item.isGhiThem)
  || isExternalFlagOn(item.ghiThem)
  || isExternalFlagOn(item.GhiThem)
  || isExternalFlagOn(item.IsGhiThem);

export const filterQuoteChiTiet = (chiTiet = []) =>
  (Array.isArray(chiTiet) ? chiTiet : []).filter((item) => !isExcludedQuoteLine(item));

/** Làm sạch payload lookup trước khi hiển thị / build repairItems khi thêm xe. */
export const sanitizeBaoGiaPayload = (baogiaGanNhat) => {
  if (!baogiaGanNhat || typeof baogiaGanNhat !== 'object') return baogiaGanNhat;
  return {
    ...baogiaGanNhat,
    chiTiet: filterQuoteChiTiet(baogiaGanNhat.chiTiet || []),
  };
};

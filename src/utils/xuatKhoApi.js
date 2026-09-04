import { api } from '../components/apis/axios';

/** Kho tổng theo spec. */
export const KHOA_KHO_TONG = 'TT00000001';

export const hanghoaNameOf = (item) =>
  String(item?.ten || item?.tenViet || item?.tenAnh || '').trim();

/** Tra cứu đúng mã — GET /hanghoa/lookup (một request). */
export const lookupHanghoaByCode = async (q, params = {}) => {
  const code = String(q || '').trim();
  const { data } = await api.get('/hanghoa/lookup', {
    params: { q: code, ...params },
    skipAuthRedirect: true,
  });
  return data;
};

/** POST http://local.otobathanh.vn/api/xe/xuat-kho */
export const commitXuatKho = async ({ khoaBaoGia, soXe, soBaoGia, ngayChungTu, lines }) => {
  const body = {
    khoaKho: KHOA_KHO_TONG,
    lines: (Array.isArray(lines) ? lines : []).map((line) => ({
      khoaHangHoa: line.khoaHangHoa,
      soLuong: Number(line.soLuong),
    })),
    dryRun: false,
  };
  if (ngayChungTu) body.ngayChungTu = ngayChungTu;
  if (khoaBaoGia) body.khoaBaoGia = khoaBaoGia;
  else if (soXe) body.soXe = String(soXe).replace(/\s/g, '');
  if (soBaoGia) body.soBaoGia = String(soBaoGia).trim();

  const { data } = await api.post('/xe/xuat-kho', body, {
    skipAuthRedirect: true,
    timeout: 45_000,
  });
  return data;
};

export const getXuatKhoLichSu = async ({ khoaBaoGia, soBaoGia } = {}) => {
  const params = {};
  const khoa = String(khoaBaoGia || '').trim();
  const ro = String(soBaoGia || '').trim();
  if (khoa) params.khoaBaoGia = khoa;
  if (ro) params.soBaoGia = ro;
  const { data } = await api.get('/hanghoa/xuat-theo-ro', {
    params,
    skipAuthRedirect: true,
  });
  return data;
};

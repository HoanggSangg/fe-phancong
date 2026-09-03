import { api } from '../components/apis/axios';

/** Kho tổng theo spec. */
export const KHOA_KHO_TONG = 'TT00000001';

/** GET http://local.otobathanh.vn/api/hanghoa?q=...&page=1&pageSize=50 */
export const lookupHanghoa = async (q, params = {}) => {
  const code = String(q || '').trim();
  const { data } = await api.get('/hanghoa', {
    params: { q: code, page: 1, pageSize: 50, ...params },
    skipAuthRedirect: true,
  });
  const items = Array.isArray(data) ? data : [];
  const nq = code.toUpperCase().replace(/\s+/g, '');
  const exact = items.find((item) =>
    [item.khoa, item.ma, item.maVach].some(
      (value) => String(value || '').toUpperCase().replace(/\s+/g, '') === nq,
    ),
  );
  if (!exact?.khoa && !exact?.ma) {
    const error = new Error(`Không đúng mã hàng hóa '${code}'.`);
    error.response = { status: 404, data: { message: error.message } };
    throw error;
  }

  const id = exact.khoa || exact.ma;
  try {
    const { data: detail } = await api.get(`/hanghoa/${encodeURIComponent(id)}`, {
      skipAuthRedirect: true,
    });
    return detail;
  } catch {
    const ton = Number(exact.tonHienTai);
    const tonHienTai = Number.isFinite(ton) ? ton : 0;
    return {
      khoa: exact.khoa || '',
      ma: exact.ma || '',
      ten: exact.tenViet || exact.ten || '',
      donViTinh: exact.donViTinh || '',
      tonHienTai,
      hetTon: tonHienTai <= 0,
    };
  }
};

export const hanghoaNameOf = (item) =>
  String(item?.ten || item?.tenViet || item?.tenAnh || '').trim();

/** Tra cứu đúng mã — dùng cho tem QR (một request). */
export const lookupHanghoaByCode = async (q, params = {}) => {
  const code = String(q || '').trim();
  const { data } = await api.get('/hanghoa/lookup', {
    params: { q: code, ...params },
    skipAuthRedirect: true,
  });
  return data;
};

export const getHanghoa = async (id, params = {}) => {
  const { data } = await api.get(`/hanghoa/${encodeURIComponent(id)}`, {
    params,
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

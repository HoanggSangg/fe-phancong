import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  Autocomplete,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  createCar,
  getAvailableWorkers,
  getAllSupervisors,
  getAllLocations,
  lookupCarOrRO,
} from '../apis/index';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import { Html5Qrcode } from 'html5-qrcode';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import { invalidateWorkerJobCaches } from '../../lib/carCache';
import { queryKeys } from '../../lib/queryKeys';
import { useToast } from '../../context/ToastContext';
import { useUnsavedChanges } from '../../context/UnsavedChangesContext';
import { extractSoChungTu, isValidSoChungTu } from '../../utils/uploadUrl';
import { filterQuoteChiTiet, sanitizeBaoGiaPayload } from '../../utils/externalQuoteItems';
import { ACCESS_HINT } from '../../constants/accessUrls';

const ADD_CAR_SCANNER_ID = 'add-car-qr-reader';

const isSecureCameraContext = () => {
  if (typeof window === 'undefined') return false;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

dayjs.extend(customParseFormat);

const money = (val) => Number(val || 0).toLocaleString('vi-VN') + ' ₫';

const cleanText = (val) => String(val || '').toUpperCase().replace(/\s/g, '');

const formatDateVN = (yyyymmdd) => {
  if (!yyyymmdd || String(yyyymmdd).length !== 8) return '';
  const s = String(yyyymmdd);
  return `${s.slice(6, 8)}-${s.slice(4, 6)}-${s.slice(0, 4)}`;
};

const getExternalContext = (externalData) => {
  const raw = externalData?.raw || {};
  const bg = raw.baogiaGanNhat || {};
  const header = bg.header || raw.header || {};
  const loaiXe = raw.loaiXe || header.loaiXe || {};

  const plateNumber = cleanText(
    externalData?.plateNumber
    || raw.soXeTimKiem
    || raw.soXe
    || header.soXe
    || ''
  );

  const roCode =
    header.soChungtu
    || externalData?.selectedRO
    || header.khoa
    || raw.khoaBaoGiaGanNhat
    || '';

  const externalCarTypeName =
    loaiXe.tenViet
    || loaiXe.tenAnh
    || loaiXe.ma
    || '';

  // Bỏ Hủy / Ghi thêm — không load vào báo giá
  const chiTiet = filterQuoteChiTiet(bg.chiTiet || raw.chiTiet || []);

  return {
    raw,
    bg,
    header,
    loaiXe,
    plateNumber,
    roCode,
    externalCarTypeName,
    chiTiet,
  };
};

const AddCar = ({ onSuccess }) => {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const [formData, setFormData] = useState({
    plateNumber: '',
    roCode: '',
    mainWorkers: [],
    subWorkers: [],
    supervisor: null,
    location: null,
    deliveryDate: null,
    deliveryHour: '',
    condition: '',
  });

  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [workersLoaded, setWorkersLoaded] = useState(false);
  const workersLoadingRef = useRef(false);

  const [externalData, setExternalData] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [isStartingQr, setIsStartingQr] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);
  const qrHandlingRef = useRef(false);

  useEffect(() => {
    const dirty = Boolean(
      formData.plateNumber?.trim()
      || formData.roCode?.trim()
      || externalData
      || (formData.mainWorkers || []).length
      || (formData.subWorkers || []).length,
    );
    setHasUnsavedChanges(dirty, 'add-car');
    return () => setHasUnsavedChanges(false, 'add-car');
  }, [formData, externalData, setHasUnsavedChanges]);

  useEffect(() => {
    let cancelled = false;

    const fetchFormMeta = async () => {
      try {
        // Cascade: locations trước → supervisors sau (tránh 2 API lớn cùng lúc)
        const locationRes = await getAllLocations();
        if (cancelled) return;
        setLocations(locationRes.data || []);

        const supervisorRes = await getAllSupervisors();
        if (cancelled) return;
        setSupervisors(supervisorRes.data || []);
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu form:', error);
      }
    };

    fetchFormMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureAvailableWorkers = useCallback(async () => {
    if (workersLoaded) return availableWorkers;
    if (workersLoadingRef.current) return availableWorkers;

    workersLoadingRef.current = true;
    try {
      const workerRes = await getAvailableWorkers();
      const data = workerRes.data || [];
      setAvailableWorkers(data);
      setWorkersLoaded(true);
      return data;
    } catch (error) {
      console.error('Lỗi khi lấy thợ rảnh:', error);
      return [];
    } finally {
      workersLoadingRef.current = false;
    }
  }, [availableWorkers, workersLoaded]);

  const searchExternalData = useCallback(async (keyword, searchType = 'plate') => {
    const cleanKeyword = cleanText(keyword);
    if (!cleanKeyword) return;

    if (searchType === 'plate' && cleanKeyword.length < 4) return;
    if (searchType === 'ro' && cleanKeyword.length < 5) return;

    try {
      setLookupLoading(true);
      setLookupError('');
      setExternalData(null);

      // TT tra theo /baogia/{TT} — không cần biển số kèm theo
      const plateParam =
        searchType === 'ro' && !cleanKeyword.startsWith('TT')
          ? formData.plateNumber
          : '';
      const res = await lookupCarOrRO(cleanKeyword, plateParam);
      const data = res.data;
      // Lọc Hủy / Ghi thêm ngay khi nhận lookup (thêm xe)
      if (data?.raw?.baogiaGanNhat) {
        data.raw.baogiaGanNhat = sanitizeBaoGiaPayload(data.raw.baogiaGanNhat);
      }
      if (data?.raw?.chiTiet) {
        data.raw.chiTiet = filterQuoteChiTiet(data.raw.chiTiet);
      }

      setExternalData(data);

      const ctx = getExternalContext(data);

      setFormData((prev) => ({
        ...prev,
        plateNumber: ctx.plateNumber || prev.plateNumber,
        roCode: ctx.roCode || prev.roCode,
        deliveryDate: ctx.header.ngayDuKienHoanThanh
          ? dayjs(formatDateVN(ctx.header.ngayDuKienHoanThanh), 'DD-MM-YYYY')
          : prev.deliveryDate,
        deliveryHour: ctx.header.gioDuKienHoanThanh
          ? Number(ctx.header.gioDuKienHoanThanh.split(':')[0])
          : prev.deliveryHour,
      }));

      ensureAvailableWorkers();
    } catch (err) {
      console.error(err);
      setLookupError(
        searchType === 'ro'
          ? cleanKeyword.startsWith('TT')
            ? 'Không tìm thấy chứng từ TT / báo giá tương ứng.'
            : 'Không tìm thấy RO. Nếu nhập RO dạng RO26010011, cần nhập biển số trước.'
          : 'Không tìm thấy biển số xe'
      );
    } finally {
      setLookupLoading(false);
    }
  }, [ensureAvailableWorkers, formData.plateNumber]);

  const stopQrScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) {
      setIsScanningQr(false);
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // ignore stop race
    }

    try {
      await scanner.clear();
    } catch {
      // ignore
    }

    scannerRef.current = null;
    setIsScanningQr(false);
  }, []);

  useEffect(() => () => {
    stopQrScanner();
  }, [stopQrScanner]);

  const handleQrScanned = useCallback(
    async (qrText) => {
      if (qrHandlingRef.current) return;
      qrHandlingRef.current = true;

      const soChungTu = extractSoChungTu(qrText);
      if (!isValidSoChungTu(soChungTu)) {
        qrHandlingRef.current = false;
        toast.error('QR không chứa mã TT hợp lệ (vd: TT0000000000198).');
        return;
      }

      toast.success(`Đã quét: ${soChungTu}`);
      await stopQrScanner();
      await searchExternalData(soChungTu, 'ro');
      qrHandlingRef.current = false;
    },
    [searchExternalData, stopQrScanner, toast],
  );

  const startQrScanner = useCallback(async () => {
    if (isStartingQr || isScanningQr) return;

    if (!isSecureCameraContext()) {
      setCameraError(
        `Trình duyệt chỉ cho mở camera khi web chạy HTTPS. ${ACCESS_HINT}`,
      );
      toast.error('Cần HTTPS để mở camera quét QR.');
      return;
    }

    setCameraError('');
    setIsStartingQr(true);

    try {
      await stopQrScanner();

      const scanner = new Html5Qrcode(ADD_CAR_SCANNER_ID, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          await handleQrScanned(decodedText);
        },
        () => {},
      );

      setIsScanningQr(true);
    } catch (err) {
      console.error(err);
      scannerRef.current = null;
      setIsScanningQr(false);
      setCameraError(
        err?.message?.includes('Permission')
          ? 'Không được cấp quyền camera. Hãy cho phép camera rồi thử lại.'
          : 'Không mở được camera. Kiểm tra HTTPS và quyền camera.',
      );
      toast.error('Không mở được camera quét QR.');
    } finally {
      setIsStartingQr(false);
    }
  }, [handleQrScanned, isScanningQr, isStartingQr, stopQrScanner, toast]);

  const buildRepairItems = () => {
    const { chiTiet } = getExternalContext(externalData);

    return chiTiet.map((item) => {
      const quantity = item.soLuong || 1;
      // giaVon từ API báo giá đã là tổng giá vốn (không phải đơn giá)
      const totalCost = Math.round(Number(item.giaVon || 0));

      return {
        groupName: item.khoanMucSuaChua || 'Khác',
        content: item.noiDung || '',
        quantity,
        unit: item.donViTinh || '',
        unitPrice: item.donGia || 0,
        unitCostPrice: totalCost,
        costAmount: totalCost,
        amount: item.thanhTien || 0,
      taxRate: item.tyLeThue || 0,
      taxAmount: item.tienThue || 0,
      discountRate: item.tyLeChietKhau || 0,
      discountAmount: item.tienChietKhau || 0,
      serviceType: item.loaiDichVu || '',
      itemType: item.loai || 0,
      externalItemId: item.khoa || '',
      raw: item,
    };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const ctx = getExternalContext(externalData);

    if (!ctx.externalCarTypeName) {
      toast.error('Chưa có loại xe từ dữ liệu API. Vui lòng tra biển số/RO trước.');
      return;
    }

    const workers = [];

    formData.mainWorkers.forEach((worker) => {
      workers.push({ worker: worker._id, role: 'main' });
    });

    formData.subWorkers.forEach((worker) => {
      const isAlreadyMain = formData.mainWorkers.some(
        (main) => main._id === worker._id
      );

      if (!isAlreadyMain) {
        workers.push({ worker: worker._id, role: 'sub' });
      }
    });

    const { header } = ctx;

    let deliveryTime = null;

    if (formData.deliveryDate && formData.deliveryHour !== '') {
      deliveryTime =
        dayjs(formData.deliveryDate)
          .hour(Number(formData.deliveryHour))
          .minute(0)
          .format('DD-MM-YYYY HH') + 'h';
    } else if (header.ngayDuKienHoanThanh && header.gioDuKienHoanThanh) {
      deliveryTime =
        `${formatDateVN(header.ngayDuKienHoanThanh)} ${header.gioDuKienHoanThanh.split(':')[0]}h`;
    }

    const roNumber = cleanText(header.soChungtu || formData.roCode || ctx.roCode || '');
    const roCode = cleanText(header.khoa || externalData?.selectedRO || '');

    if (!roNumber && !roCode) {
      toast.error('Thiếu số RO. Vui lòng tra cứu biển số hoặc RO trước khi thêm xe.');
      return;
    }

    const carToCreate = {
      plateNumber: formData.plateNumber || ctx.plateNumber,
      supervisor: formData.supervisor?._id || null,
      location: formData.location?._id || null,
      deliveryTime,
      condition: formData.condition || null,
      workers,

      roCode,
      roNumber,
      externalCarTypeName: ctx.externalCarTypeName,
      advisorName: header.coVanDichVu1 || '',

      repairItems: buildRepairItems(),
    };

    try {
      await createCar(carToCreate);
      invalidateWorkerJobCaches();
      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.cars }),
        queryClient.refetchQueries({ queryKey: queryKeys.carsMine }),
      ]);

      setFormData({
        plateNumber: '',
        roCode: '',
            mainWorkers: [],
        subWorkers: [],
        supervisor: null,
        location: null,
        deliveryDate: null,
        deliveryHour: '',
        condition: '',
      });

      setExternalData(null);
      onSuccess && onSuccess();
      navigate('/cars/manage');
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || 'Đã xảy ra lỗi khi thêm xe';
      toast.error(errorMsg);
      console.error('Lỗi khi thêm xe:', error);
    }
  };

  const ExternalInfoBox = () => {
    if (!externalData) return null;

    const ctx = getExternalContext(externalData);
    const { raw, header, chiTiet } = ctx;

    const grouped = chiTiet.reduce((acc, item) => {
      const key = item.khoanMucSuaChua || 'Khác';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: '#f8fafc',
          borderColor: '#bfdbfe',
        }}
      >
        <Typography fontWeight="bold" color="primary" mb={1}>
          Dữ liệu xe / lệnh sửa chữa
        </Typography>

        <Box sx={{ display: 'grid', gap: 0.8, fontSize: 14 }}>
          <div><b>Biển số:</b> {raw.soXe || header.soXe || ctx.plateNumber}</div>
          <div><b>Số RO:</b> {header.soChungtu || formData.roCode || ctx.roCode || ''}</div>
          <div><b>Hãng:</b> {raw.hangSanXuat?.tenViet || header.hangSanXuat?.tenViet || ''}</div>
          <div><b>Loại xe API:</b> {ctx.externalCarTypeName}</div>
          <div><b>Đời xe:</b> {raw.doiXe || header.doiXe || ''}</div>
          <div><b>Model:</b> {raw.model || header.model || ''}</div>
          <div><b>Màu sơn:</b> {raw.mauSon || header.mauSon || ''}</div>
          <div><b>Số KM:</b> {(raw.soKmHienTai || header.soKmHienTai)?.toLocaleString?.('vi-VN') || ''}</div>
          <div><b>Tài xế:</b> {raw.tenTaiXe || header.tenTaiXe || ''}</div>
          <div><b>SĐT:</b> {raw.dienThoaiTaiXe || header.dienThoaiTaiXe || ''}</div>
          <div><b>Dự kiến giao:</b> {formatDateVN(header.ngayDuKienHoanThanh)} {header.gioDuKienHoanThanh || ''}</div>
          <div><b>Cố vấn:</b> {header.coVanDichVu1 || ''}</div>
          <div><b>Yêu cầu KH:</b> {header.khachHangYeuCau || ''}</div>
          <div><b>Tình trạng tiếp nhận:</b> {header.tinhTrangTiepNhan || ''}</div>
          <div><b>Tổng tiền:</b> {money(header.tongTienSuaChua)}</div>
        </Box>

        {Object.keys(grouped).length > 0 && (
          <Box mt={2}>
            <Typography fontWeight="bold" mb={1}>
              Chi tiết lệnh sửa chữa
            </Typography>

            {Object.entries(grouped).map(([group, items]) => (
              <Box key={group} sx={{ mb: 2 }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: '#dc2626',
                    borderLeft: '4px solid #dc2626',
                    pl: 1,
                    mb: 1,
                  }}
                >
                  {group}
                </Typography>

                {items.map((item, index) => (
                  <Box
                    key={item.khoa || index}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: '1fr 55px 100px 110px',
                      },
                      gap: 1,
                      py: 0.8,
                      borderBottom: '1px solid #e5e7eb',
                      fontSize: 13,
                    }}
                  >
                    <span>{item.noiDung}</span>
                    <span>SL: {item.soLuong}</span>
                    <span>{money(item.donGia)}</span>
                    <span>{money(item.thanhTien)}</span>
                  </Box>
                ))}

                <Box sx={{ textAlign: 'right', mt: 1, fontWeight: 700 }}>
                  Tạm tính:{' '}
                  {money(items.reduce((sum, x) => sum + Number(x.thanhTien || 0), 0))}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    );
  };

  return (
    <PageLayout>
      <PageHeader
        icon={<DirectionsCarIcon color="primary" />}
        title="Thêm xe mới"
        subtitle="Quét QR báo giá (TT…) hoặc nhập biển số / RO để tải dữ liệu có sẵn."
      />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {!isScanningQr ? (
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={
                    isStartingQr
                      ? <CircularProgress size={16} />
                      : <QrCodeScannerIcon />
                  }
                  onClick={startQrScanner}
                  disabled={isStartingQr || lookupLoading}
                >
                  {isStartingQr ? 'Đang mở camera…' : 'Quét QR để thêm xe'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outlined"
                  color="error"
                  startIcon={<StopCircleIcon />}
                  onClick={stopQrScanner}
                >
                  Dừng quét
                </Button>
              )}
            </Stack>

            {cameraError && (
              <Alert severity="warning" onClose={() => setCameraError('')}>
                {cameraError}
              </Alert>
            )}

            <Box
              id={ADD_CAR_SCANNER_ID}
              sx={{
                width: '100%',
                maxWidth: 360,
                minHeight: isScanningQr ? 260 : 0,
                overflow: 'hidden',
                borderRadius: 1,
                bgcolor: isScanningQr ? '#111' : 'transparent',
                '& video': { borderRadius: 1 },
              }}
            />
          </Stack>
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          <TextField
            label="Biển số xe"
            value={formData.plateNumber}
            onChange={(e) => {
              setFormData((prev) => ({
                ...prev,
                plateNumber: cleanText(e.target.value),
              }));
              setExternalData(null);
              setLookupError('');
            }}
            onBlur={() => {
              if (formData.plateNumber) {
                searchExternalData(formData.plateNumber, 'plate');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                searchExternalData(formData.plateNumber, 'plate');
              }
            }}
            required
            fullWidth
            helperText="VD: 50Z6699, 51G18419, PP4048"
          />

          <TextField
            label="Số RO / mã TT"
            value={formData.roCode}
            onChange={(e) => {
              setFormData((prev) => ({
                ...prev,
                roCode: cleanText(e.target.value),
              }));
              setExternalData(null);
              setLookupError('');
            }}
            onBlur={() => {
              if (formData.roCode) {
                searchExternalData(formData.roCode, 'ro');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                searchExternalData(formData.roCode, 'ro');
              }
            }}
            fullWidth
            helperText="VD: RO26010011 hoặc TT0000000000198"
          />
        </Box>

        {lookupLoading && (
          <Typography color="primary" fontSize={13}>
            Đang tải dữ liệu xe...
          </Typography>
        )}

        {lookupError && (
          <Typography color="error" fontSize={13}>
            {lookupError}
          </Typography>
        )}

        <ExternalInfoBox />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Autocomplete
            multiple
            options={availableWorkers.filter(
              (w) => !formData.subWorkers.some((sub) => sub._id === w._id)
            )}
            getOptionLabel={(option) => option.name || ''}
            value={formData.mainWorkers}
            onOpen={ensureAvailableWorkers}
            onChange={(e, value) =>
              setFormData((prev) => ({ ...prev, mainWorkers: value }))
            }
            renderInput={(params) => (
              <TextField {...params} label="Thợ chính" helperText="Có thể chọn nhiều thợ chính" />
            )}
          />

          <Autocomplete
            multiple
            options={availableWorkers.filter(
              (w) => !formData.mainWorkers.some((main) => main._id === w._id)
            )}
            getOptionLabel={(option) => option.name || ''}
            value={formData.subWorkers}
            onOpen={ensureAvailableWorkers}
            onChange={(e, value) =>
              setFormData((prev) => ({ ...prev, subWorkers: value }))
            }
            renderInput={(params) => (
              <TextField {...params} label="Thợ phụ" helperText="Có thể chọn nhiều thợ phụ" />
            )}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Autocomplete
            options={supervisors}
            getOptionLabel={(option) => option.name || ''}
            value={formData.supervisor}
            onChange={(e, value) =>
              setFormData((prev) => ({ ...prev, supervisor: value }))
            }
            renderInput={(params) => (
              <TextField {...params} label="Giám sát" helperText="Chọn giám sát viên" />
            )}
          />

          <Autocomplete
            options={locations}
            getOptionLabel={(option) => option.name || ''}
            value={formData.location}
            onChange={(e, value) =>
              setFormData((prev) => ({ ...prev, location: value }))
            }
            renderInput={(params) => (
              <TextField {...params} label="Địa điểm" helperText="Chọn địa điểm nhận xe" />
            )}
          />
        </Box>

        <Button type="submit" variant="contained" sx={{ mt: 2 }}>
          Thêm xe
        </Button>
      </Box>
    </PageLayout>
  );
};

export default AddCar;
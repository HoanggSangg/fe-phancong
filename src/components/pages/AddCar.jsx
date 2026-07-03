import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  Autocomplete,
  Divider,
} from '@mui/material';
import {
  createCar,
  getAvailableWorkers,
  getAllSupervisors,
  getAllLocations,
  lookupCarOrRO,
} from '../apis/index';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

dayjs.extend(customParseFormat);

const money = (val) => Number(val || 0).toLocaleString('vi-VN') + ' ₫';

const cleanText = (val) => String(val || '').toUpperCase().replace(/\s/g, '');

const formatDateVN = (yyyymmdd) => {
  if (!yyyymmdd || String(yyyymmdd).length !== 8) return '';
  const s = String(yyyymmdd);
  return `${s.slice(6, 8)}-${s.slice(4, 6)}-${s.slice(0, 4)}`;
};

const AddCar = ({ onSuccess }) => {
  const navigate = useNavigate();

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

  const [externalData, setExternalData] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [workerRes, supervisorRes, locationRes] = await Promise.all([
          getAvailableWorkers(),
          getAllSupervisors(),
          getAllLocations(),
        ]);

        setAvailableWorkers(workerRes.data || []);
        setSupervisors(supervisorRes.data || []);
        setLocations(locationRes.data || []);
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
      }
    };

    fetchData();
  }, []);

  const searchExternalData = async (keyword, searchType = 'plate') => {
    const cleanKeyword = cleanText(keyword);
    if (!cleanKeyword) return;

    if (searchType === 'plate' && cleanKeyword.length < 8) return;
    if (searchType === 'ro' && cleanKeyword.length < 5) return;

    try {
      setLookupLoading(true);
      setLookupError('');
      setExternalData(null);

      const plateParam = searchType === 'ro' ? formData.plateNumber : '';
      const res = await lookupCarOrRO(cleanKeyword, plateParam);
      const data = res.data;

      setExternalData(data);

      const raw = data.raw || {};
      const bg = raw.baogiaGanNhat || {};
      const header = bg.header || raw.header || {};

      const apiPlate =
        data.plateNumber ||
        raw.soXeTimKiem ||
        raw.soXe ||
        header.soXe ||
        '';

      const roCode =
        header.soChungtu ||
        data.selectedRO ||
        header.khoa ||
        raw.khoaBaoGiaGanNhat ||
        '';

      const externalCarType =
        raw.loaiXe?.tenViet ||
        raw.loaiXe?.tenAnh ||
        raw.loaiXe?.ma ||
        '';

      setFormData((prev) => ({
        ...prev,

        plateNumber: apiPlate
          ? String(apiPlate).replace(/\s/g, '')
          : prev.plateNumber,

        roCode: roCode || prev.roCode,


        deliveryDate: header.ngayDuKienHoanThanh
          ? dayjs(formatDateVN(header.ngayDuKienHoanThanh), 'DD-MM-YYYY')
          : prev.deliveryDate,

        deliveryHour: header.gioDuKienHoanThanh
          ? Number(header.gioDuKienHoanThanh.split(':')[0])
          : prev.deliveryHour,
      }));
    } catch (err) {
      console.error(err);
      setLookupError(
        searchType === 'ro'
          ? 'Không tìm thấy RO. Nếu nhập RO dạng RO26010011, cần nhập biển số trước.'
          : 'Không tìm thấy biển số xe'
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const buildRepairItems = () => {
    const raw = externalData?.raw || {};
    const bg = raw.baogiaGanNhat || {};
    const chiTiet = (bg.chiTiet || raw.chiTiet || []).filter((x) => x.huy !== 1);

    return chiTiet.map((item) => ({
      groupName: item.khoanMucSuaChua || 'Khác',
      content: item.noiDung || '',
      quantity: item.soLuong || 1,
      unit: item.donViTinh || '',
      unitPrice: item.donGia || 0,
      amount: item.thanhTien || 0,
      taxRate: item.tyLeThue || 0,
      taxAmount: item.tienThue || 0,
      discountRate: item.tyLeChietKhau || 0,
      discountAmount: item.tienChietKhau || 0,
      serviceType: item.loaiDichVu || '',
      itemType: item.loai || 0,
      externalItemId: item.khoa || '',
      raw: item,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!externalData?.raw?.loaiXe?.tenViet) {
      alert('Chưa có loại xe từ dữ liệu API. Vui lòng tra biển số/RO trước.');
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

    const raw = externalData?.raw || {};
    const bg = raw.baogiaGanNhat || {};
    const header = bg.header || raw.header || {};

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

    const carToCreate = {
      plateNumber: formData.plateNumber,
      supervisor: formData.supervisor?._id || null,
      location: formData.location?._id || null,
      deliveryTime,
      condition: formData.condition || null,
      workers,
    
      roCode: header.khoa || externalData?.selectedRO || '',
      roNumber: header.soChungtu || formData.roCode || '',
      externalCarTypeName: raw.loaiXe?.tenViet || '',
      advisorName: header.coVanDichVu1 || '',
    
      repairItems: buildRepairItems(),
    };

    try {
      await createCar(carToCreate);

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
      alert(errorMsg);
      console.error('Lỗi khi thêm xe:', error);
    }
  };

  const ExternalInfoBox = () => {
    if (!externalData) return null;

    const raw = externalData.raw || {};
    const bg = raw.baogiaGanNhat || {};
    const header = bg.header || raw.header || {};
    const chiTiet = (bg.chiTiet || raw.chiTiet || []).filter((x) => x.huy !== 1);

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
          <div><b>Biển số:</b> {raw.soXe || header.soXe || externalData.plateNumber}</div>
          <div><b>Số RO:</b> {header.soChungtu || formData.roCode || ''}</div>
          <div><b>Hãng:</b> {raw.hangSanXuat?.tenViet || ''}</div>
          <div><b>Loại xe API:</b> {raw.loaiXe?.tenViet || ''}</div>
          <div><b>Đời xe:</b> {raw.doiXe || ''}</div>
          <div><b>Model:</b> {raw.model || ''}</div>
          <div><b>Màu sơn:</b> {raw.mauSon || ''}</div>
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
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2, sm: 4 },
        mb: 4,
        borderRadius: 4,
        boxShadow: '0 4px 24px rgba(37,99,235,0.10)',
      }}
    >
      <Box
        sx={{
          background: '#f5f5f5',
          borderRadius: 2,
          px: { xs: 2, sm: 4 },
          py: { xs: 2, sm: 3 },
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          justifyContent: 'center',
        }}
      >
        <DirectionsCarIcon color="primary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold" color="primary">
            Thêm xe mới
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Nhập biển số hoặc RO để tải dữ liệu có sẵn.
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
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
            helperText="VD: 50LD06707"
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
    </Paper>
  );
};

export default AddCar;
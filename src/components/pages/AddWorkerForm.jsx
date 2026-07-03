import React from 'react';
import { createWorker } from '../apis/index';
import { TextField, Button, Box } from '@mui/material';
import imageCompression from 'browser-image-compression';

const AddWorkerForm = ({ onSuccess, searchName, setSearchName, embedded = false }) => {
  const [soBaoDanh, setSoBaoDanh] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [avatarFile, setAvatarFile] = React.useState(null);
  const [avatarPreview, setAvatarPreview] = React.useState('');

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!searchName.trim()) {
      alert('Vui lòng nhập tên thợ');
      return;
    }

    if (!soBaoDanh.trim()) {
      alert('Vui lòng nhập số báo danh');
      return;
    }

    let avatarBase64 = '';

    if (avatarFile) {
      avatarBase64 = await fileToBase64(avatarFile);
    }

    const data = {
      name: searchName.trim(),
      soBaoDanh: soBaoDanh.trim(),
      avatar: avatarBase64,
      countRevenue: true,
    };

    try {
      setLoading(true);
      await createWorker(data);

      onSuccess && onSuccess();

      setSearchName('');
      setSoBaoDanh('');
      setAvatarFile(null);
      setAvatarPreview('');
    } catch (err) {
      console.error('Lỗi khi tạo thợ:', err);
      alert(err.response?.data?.message || 'Lỗi khi tạo thợ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={
        embedded
          ? { width: '100%' }
          : { mt: 2, mb: 3, maxWidth: { xs: '95vw', sm: 600 }, mx: 'auto' }
      }
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          flexDirection: embedded ? { xs: 'column', lg: 'row' } : 'column',
          alignItems: embedded ? { lg: 'flex-end' } : 'stretch',
          flexWrap: embedded ? 'wrap' : 'nowrap',
          gap: embedded ? { xs: 1.5, lg: 1.25 } : 1.5,
          ...(embedded
            ? {}
            : {
                background: '#fff',
                borderRadius: 3,
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                p: { xs: 1.5, sm: 2.5 },
              }),
        }}
      >
        <TextField
          label="Tên thợ"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          required
          fullWidth
          size={embedded ? 'small' : 'medium'}
          sx={embedded ? { flex: { lg: '2 1 180px' }, minWidth: 140 } : undefined}
        />

        <TextField
          label="Số báo danh"
          value={soBaoDanh}
          onChange={(e) => setSoBaoDanh(e.target.value)}
          required
          fullWidth
          size={embedded ? 'small' : 'medium'}
          sx={embedded ? { flex: { lg: '1 1 120px' }, minWidth: 110 } : undefined}
        />

        <Button
          variant="outlined"
          component="label"
          size={embedded ? 'small' : 'medium'}
          sx={{
            borderRadius: 2,
            py: embedded ? 0.85 : 1.2,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            textTransform: 'none',
          }}
        >
          Chọn ảnh
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;

              const compressedFile = await imageCompression(file, {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 800,
                useWebWorker: true,
              });

              setAvatarFile(compressedFile);
              setAvatarPreview(URL.createObjectURL(compressedFile));
            }}
          />
        </Button>

        {avatarPreview && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <img
              src={avatarPreview}
              alt="Ảnh thợ"
              style={{
                width: embedded ? 36 : 90,
                height: embedded ? 36 : 90,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #dbeafe',
              }}
            />
          </Box>
        )}

        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          fullWidth={!embedded}
          size={embedded ? 'small' : 'medium'}
          sx={{
            fontSize: embedded ? 14 : 16,
            py: embedded ? 0.85 : 1.5,
            px: embedded ? 2.5 : undefined,
            borderRadius: 2,
            bgcolor: '#2563eb',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            '&:hover': { bgcolor: '#1d4ed8' },
          }}
        >
          {loading ? 'Đang thêm...' : 'Thêm thợ'}
        </Button>
      </Box>
    </Box>
  );
};

export default AddWorkerForm;

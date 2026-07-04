import { useState } from 'react';
import { createWorker } from '../apis/index';
import { TextField, Button, Box } from '@mui/material';
import imageCompression from 'browser-image-compression';

const AddWorkerForm = ({ onSuccess, embedded = false }) => {
  const [workerName, setWorkerName] = useState('');
  const [soBaoDanh, setSoBaoDanh] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!workerName.trim()) {
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

    try {
      setLoading(true);
      await createWorker({
        name: workerName.trim(),
        soBaoDanh: soBaoDanh.trim(),
        avatar: avatarBase64,
        countRevenue: true,
      });

      onSuccess?.();
      setWorkerName('');
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
    <Box sx={embedded ? { width: '100%' } : { mt: 2, mb: 3, maxWidth: { xs: '95vw', sm: 600 }, mx: 'auto' }}>
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
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                p: { xs: 1.5, sm: 2 },
              }),
        }}
      >
        <TextField
          label="Tên thợ"
          value={workerName}
          onChange={(e) => setWorkerName(e.target.value)}
          required
          fullWidth
          sx={embedded ? { flex: { lg: '2 1 180px' }, minWidth: 140 } : undefined}
        />

        <TextField
          label="Số báo danh"
          value={soBaoDanh}
          onChange={(e) => setSoBaoDanh(e.target.value)}
          required
          fullWidth
          sx={embedded ? { flex: { lg: '1 1 120px' }, minWidth: 110 } : undefined}
        />

        <Button variant="outlined" component="label" sx={{ flexShrink: 0, whiteSpace: 'nowrap', textTransform: 'none' }}>
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
          sx={{ flexShrink: 0, whiteSpace: 'nowrap', textTransform: 'none' }}
        >
          {loading ? 'Đang thêm...' : 'Thêm thợ'}
        </Button>
      </Box>
    </Box>
  );
};

export default AddWorkerForm;

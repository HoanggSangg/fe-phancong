import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  IconButton,
  Dialog,
  CircularProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CloseIcon from '@mui/icons-material/Close';
import imageCompression from 'browser-image-compression';
import { useToast } from '../../context/ToastContext';
import { LAYOUT } from '../../constants/layout';
import {
  getDocumentFileUrl,
  getDocumentFiles,
  uploadDocumentFile,
} from '../../utils/documentImageApi';
import { sanitizeUploadFileName, withSafeUploadFileName } from '../../utils/documentImageFileName';

const IMAGE_EXT = ['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'gif', 'bmp', 'webp'];
const VIDEO_EXT = ['mp4', 'm4v', 'mov', 'webm', '3gp', '3gpp'];
const ALLOWED_EXT = [...IMAGE_EXT, ...VIDEO_EXT];
const MAX_UPLOAD = 200 * 1024 * 1024;
const COMPRESS_THRESHOLD = 800 * 1024;

const extOf = (name = '') => {
  const match = /\.([^.]+)$/.exec(name);
  return match ? match[1].toLowerCase() : '';
};

const isImageName = (name) => IMAGE_EXT.includes(extOf(name));
const isVideoName = (name) => VIDEO_EXT.includes(extOf(name));
const isAllowedFile = (file) => {
  const ext = extOf(file.name);
  return ALLOWED_EXT.includes(ext) || /^(image|video)\//.test(file.type || '');
};

const fmtSize = (bytes = 0) => {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

const mimeToExt = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/3gpp': '3gp',
  'video/3gpp2': '3gp',
};

/** Đặt tên file theo timestamp để tránh ghi đè (camera thường trả image.jpg trùng tên). */
const renameWithTimestamp = (file) => {
  const fromName = extOf(file.name);
  const fromMime = mimeToExt[file.type] || '';
  const ext =
    fromName ||
    fromMime ||
    (String(file.type || '').startsWith('video/') ? 'mp4' : 'jpg');
  const stamp = Date.now();
  return new File([file], sanitizeUploadFileName(`${stamp}.${ext}`, { fallbackStamp: stamp }), {
    type: file.type || 'application/octet-stream',
    lastModified: Date.now(),
  });
};

const maybeCompressImage = async (file, enabled) => {
  const ext = extOf(file.name);
  const compressible = ['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'bmp'].includes(ext);
  if (!enabled || !compressible || file.size <= COMPRESS_THRESHOLD) {
    return file;
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.85,
    });
    const nextName = file.name.replace(/\.[^.]+$/, '.jpg');
    return new File([compressed], nextName, {
      type: compressed.type || 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
};

const DocumentImageUploader = ({ soChungTu, seedFiles = [], seedToken = 0 }) => {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const pendingIdRef = useRef(0);
  const lastSeedTokenRef = useRef(0);

  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [pending, setPending] = useState([]);
  const [compress, setCompress] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [preview, setPreview] = useState(null);

  const doc = String(soChungTu || '').trim().toUpperCase();

  const loadFiles = useCallback(async () => {
    if (!doc) return;
    setLoadingFiles(true);
    try {
      const list = await getDocumentFiles(doc);
      setFiles(list);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Không tải được danh sách ảnh.');
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [doc, toast]);

  const addFiles = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList || []);
      if (!incoming.length) return;

      const nextItems = [];
      const usedNames = new Set();
      incoming.forEach((file) => {
        if (!isAllowedFile(file)) {
          toast.warning(`Bỏ qua file không hỗ trợ: ${file.name}`);
          return;
        }
        if (file.size > MAX_UPLOAD) {
          toast.warning(`File quá lớn (>200MB): ${file.name}`);
          return;
        }

        let safeFile = withSafeUploadFileName(file);
        let safeName = safeFile.name;
        if (usedNames.has(safeName)) {
          const ext = extOf(safeName) || 'jpg';
          const base = extOf(safeName) ? safeName.slice(0, -(ext.length + 1)) : safeName;
          safeName = sanitizeUploadFileName(`${base}_${Date.now()}.${ext}`);
          safeFile = new File([safeFile], safeName, {
            type: safeFile.type || 'application/octet-stream',
            lastModified: safeFile.lastModified || Date.now(),
          });
        }
        usedNames.add(safeName);

        pendingIdRef.current += 1;
        const id = pendingIdRef.current;
        const previewUrl =
          isImageName(safeName) || (safeFile.type && safeFile.type.startsWith('image/'))
            ? URL.createObjectURL(safeFile)
            : '';

        nextItems.push({
          id,
          file: safeFile,
          name: safeName,
          size: safeFile.size,
          previewUrl,
          status: 'ready',
          progress: 0,
          error: '',
        });
      });

      if (nextItems.length) {
        setPending((prev) => [...prev, ...nextItems]);
      }
    },
    [toast],
  );

  useEffect(() => {
    setPending((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    setFiles([]);
    lastSeedTokenRef.current = 0;
    if (doc) loadFiles();
    // Chỉ reset khi đổi số chứng từ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  // Ảnh vừa chụp/đọc QR → đưa vào danh sách chờ tải lên
  useEffect(() => {
    if (!doc || !seedToken || seedToken === lastSeedTokenRef.current) return;
    if (!seedFiles?.length) return;
    lastSeedTokenRef.current = seedToken;
    addFiles(seedFiles);
  }, [doc, seedToken, seedFiles, addFiles]);

  useEffect(
    () => () => {
      setPending((prev) => {
        prev.forEach((item) => {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
        return prev;
      });
    },
    [],
  );

  const removePending = (id) => {
    setPending((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearPending = () => {
    setPending((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
  };

  const handleUploadAll = async () => {
    if (!doc || uploading) return;

    const queue = pending.filter((item) => item.status === 'ready' || item.status === 'error');
    if (!queue.length) {
      toast.info('Chưa có file nào để tải lên.');
      return;
    }

    const conflicts = queue.filter((item) => files.includes(item.name));
    if (conflicts.length) {
      const ok = window.confirm(
        `Có ${conflicts.length} file trùng tên với file đã có (vd: "${conflicts[0].name}").\n\nTải lên sẽ GHI ĐÈ file cũ. Tiếp tục?`,
      );
      if (!ok) return;
    }

    setUploading(true);
    setOverallProgress(0);

    const totalBytes = queue.reduce((sum, item) => sum + (item.size || 0), 0) || 1;
    let settledBytes = 0;
    let failCount = 0;

    for (const item of queue) {
      setPending((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, status: 'uploading', progress: 0, error: '' } : row,
        ),
      );

      try {
        const uploadFile = await maybeCompressImage(item.file, compress);
        if (uploadFile.size > MAX_UPLOAD) {
          throw new Error(`Quá lớn (${fmtSize(uploadFile.size)})`);
        }

        await uploadDocumentFile(doc, uploadFile, (fraction) => {
          setPending((prev) =>
            prev.map((row) =>
              row.id === item.id ? { ...row, progress: Math.round(fraction * 100) } : row,
            ),
          );
          setOverallProgress(
            Math.min(100, Math.round(((settledBytes + fraction * item.size) / totalBytes) * 100)),
          );
        });

        settledBytes += item.size;
        setPending((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, status: 'done', progress: 100 } : row,
          ),
        );
      } catch (error) {
        failCount += 1;
        settledBytes += item.size;
        const message =
          error?.response?.data?.message || error?.message || `HTTP ${error?.response?.status || ''}`.trim();
        setPending((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, status: 'error', error: message, progress: 0 } : row,
          ),
        );
      }

      setOverallProgress(Math.min(100, Math.round((settledBytes / totalBytes) * 100)));
    }

    setUploading(false);
    await loadFiles();

    if (failCount === 0) {
      toast.success(`Đã tải lên ${queue.length} file.`);
      clearPending();
      setOverallProgress(0);
    } else {
      toast.warning(`Hoàn tất với ${failCount} file lỗi. Các file thành công đã lên server.`);
    }
  };

  const galleryItems = useMemo(
    () =>
      files.map((name) => ({
        name,
        url: getDocumentFileUrl(doc, name),
        isImage: isImageName(name),
        isVideo: isVideoName(name),
      })),
    [doc, files],
  );

  if (!doc) return null;

  return (
    <Stack spacing={LAYOUT.sectionGap}>
      <Paper variant="outlined" sx={{ p: LAYOUT.paperPadding, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Tải ảnh / video lên — {doc}
        </Typography>

        <Box
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: '2px dashed',
            borderColor: 'grey.400',
            borderRadius: 2,
            bgcolor: 'grey.50',
            px: 2,
            py: 3,
            textAlign: 'center',
            cursor: 'pointer',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
          <Typography variant="body2" fontWeight={600}>
            Kéo thả ảnh / video vào đây, hoặc bấm để chọn file
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            JPG, PNG, GIF, WEBP, MP4, MOV… · Tối đa 200 MB/file · Chọn nhiều file cùng lúc
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }} useFlexGap flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<PhotoCameraIcon />}
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
          >
            Chụp ảnh / quay video
          </Button>
          <FormControlLabel
            control={
              <Checkbox
                checked={compress}
                onChange={(e) => setCompress(e.target.checked)}
                disabled={uploading}
                size="small"
              />
            }
            label="Tự động nén ảnh lớn trước khi tải lên"
          />
        </Stack>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          accept=".jpg,.jpeg,.jpe,.jfif,.png,.gif,.bmp,.webp,.mp4,.m4v,.mov,.webm,.3gp,.3gpp,image/*,video/*"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          hidden
          accept="image/*,video/*"
          capture="environment"
          onChange={(e) => {
            const renamed = Array.from(e.target.files || []).map((file) =>
              renameWithTimestamp(file),
            );
            addFiles(renamed);
            e.target.value = '';
          }}
        />

        {pending.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                Chờ tải lên ({pending.length})
              </Typography>
              <Button
                size="small"
                color="inherit"
                startIcon={<DeleteOutlineIcon />}
                onClick={clearPending}
                disabled={uploading}
              >
                Xóa danh sách
              </Button>
            </Stack>

            <Grid container spacing={1}>
              {pending.map((item) => (
                <Grid key={item.id} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 1, borderRadius: 1.5, height: '100%' }}>
                    <Box
                      sx={{
                        position: 'relative',
                        width: '100%',
                        pt: '70%',
                        bgcolor: 'grey.100',
                        borderRadius: 1,
                        overflow: 'hidden',
                        mb: 0.75,
                      }}
                    >
                      {item.previewUrl ? (
                        <Box
                          component="img"
                          src={item.previewUrl}
                          alt={item.name}
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="caption">VIDEO</Typography>
                        </Box>
                      )}
                      {!uploading && item.status !== 'uploading' && (
                        <IconButton
                          size="small"
                          onClick={() => removePending(item.id)}
                          sx={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            bgcolor: 'rgba(255,255,255,0.9)',
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    <Typography variant="caption" noWrap title={item.name} sx={{ display: 'block' }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fmtSize(item.size)}
                      {item.status === 'uploading' ? ` · ${item.progress}%` : ''}
                      {item.status === 'done' ? ' · Xong' : ''}
                      {item.status === 'error' ? ` · Lỗi` : ''}
                    </Typography>
                    {item.status === 'uploading' && (
                      <LinearProgress variant="determinate" value={item.progress} sx={{ mt: 0.5 }} />
                    )}
                    {item.error && (
                      <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                        {item.error}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {uploading && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Đang tải lên… {overallProgress}%
                </Typography>
                <LinearProgress variant="determinate" value={overallProgress} sx={{ mt: 0.5 }} />
              </Box>
            )}

            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={handleUploadAll}
              disabled={uploading}
              sx={{ mt: 1.5 }}
            >
              {uploading ? 'Đang tải lên...' : 'Tải lên tất cả'}
            </Button>
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: LAYOUT.paperPadding, borderRadius: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1.5 }}
        >
          <Typography variant="subtitle2" fontWeight={700}>
            Ảnh / video hiện có ({files.length})
          </Typography>
          <Button
            size="small"
            startIcon={loadingFiles ? <CircularProgress size={14} /> : <RefreshIcon />}
            onClick={loadFiles}
            disabled={loadingFiles || uploading}
          >
            Tải lại
          </Button>
        </Stack>

        {loadingFiles && !galleryItems.length ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : !galleryItems.length ? (
          <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">Chưa có ảnh / video cho chứng từ này.</Typography>
          </Box>
        ) : (
          <Grid container spacing={1}>
            {galleryItems.map((item) => (
              <Grid key={item.name} size={{ xs: 6, sm: 4, md: 3 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                  onClick={() => setPreview(item)}
                >
                  <Box sx={{ position: 'relative', width: '100%', pt: '75%', bgcolor: 'grey.100' }}>
                    {item.isImage ? (
                      <Box
                        component="img"
                        src={item.url}
                        alt={item.name}
                        loading="lazy"
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" fontWeight={700}>
                          VIDEO
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Typography variant="caption" noWrap sx={{ display: 'block', px: 1, py: 0.75 }}>
                    {item.name}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="md" fullWidth>
        <Box sx={{ position: 'relative', bgcolor: '#000' }}>
          <IconButton
            onClick={() => setPreview(null)}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, color: '#fff' }}
          >
            <CloseIcon />
          </IconButton>
          {preview?.isImage && (
            <Box
              component="img"
              src={preview.url}
              alt={preview.name}
              sx={{ display: 'block', width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
          {preview?.isVideo && (
            <Box
              component="video"
              src={preview.url}
              controls
              playsInline
              sx={{ display: 'block', width: '100%', maxHeight: '80vh' }}
            />
          )}
          <Typography sx={{ color: '#fff', px: 2, py: 1 }} variant="caption">
            {preview?.name}
          </Typography>
        </Box>
      </Dialog>
    </Stack>
  );
};

export default DocumentImageUploader;

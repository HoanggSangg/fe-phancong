import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Autocomplete,
} from '@mui/material';

import { getAllWorkers } from '../apis/index';

const STORAGE_KEY = 'borrowedWorkers';

const ManageBorrow = () => {
  // ===== STATE =====
  const [borrowedWorkers, setBorrowedWorkers] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [workers, setWorkers] = useState([]);

  const [selectedWorker, setSelectedWorker] = useState('');
  const [borrowedItem, setBorrowedItem] = useState('');
  const [status, setStatus] = useState('Chưa trả');

  // ⭐ THỜI GIAN
  const [borrowTime, setBorrowTime] = useState('');

  // ===== SAVE LOCAL STORAGE =====
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(borrowedWorkers));
  }, [borrowedWorkers]);

  // ===== FETCH WORKERS =====
  const fetchAllWorkers = async () => {
    try {
      const res = await getAllWorkers();
      setWorkers(res.data || []);
    } catch {
      setWorkers([]);
    }
  };

  useEffect(() => {
    fetchAllWorkers();
  }, []);

  // ===== ADD =====
  const handleBorrow = () => {
    if (!selectedWorker || !borrowedItem || !borrowTime) return;

    const newBorrow = {
      id: Date.now(),
      name: selectedWorker,
      borrowedParts: borrowedItem,
      status: status,
      time: borrowTime,
    };

    setBorrowedWorkers((prev) => [...prev, newBorrow]);

    // reset
    setSelectedWorker('');
    setBorrowedItem('');
    setStatus('Chưa trả');
    setBorrowTime('');
  };

  // ===== DELETE (update status = Đã trả) =====
  const handleDelete = (id) => {
    setBorrowedWorkers((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'Đã trả' } : item
      )
    );
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
      }}
    >
      <Box sx={{ maxWidth: 1300, mx: 'auto' }}>
        <Typography variant="h4" mb={3} sx={{ fontWeight: 800, color: '#1f2937' }}>
          Danh sách mượn phụ tùng
        </Typography>

        <Box
          mb={4}
          sx={{
            backgroundColor: '#ffffff',
            padding: { xs: 2, md: 3 },
            borderRadius: 3,
            boxShadow: 1,
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* Mở rộng: giữ form thêm trên cùng một hàng (>= md) */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: '1.2fr 1.1fr 0.7fr 1.1fr auto',
              },
              gap: 2,
              alignItems: 'center',
            }}
          >
            {/* Worker Autocomplete */}
            <Autocomplete
              freeSolo
              options={workers.map((w) => w.name)}
              value={selectedWorker}
              onInputChange={(event, newValue) => setSelectedWorker(newValue)}
              sx={{ width: '100%' }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Nhập hoặc chọn thợ"
                  placeholder="Nhập hoặc chọn thợ"
                  variant="outlined"
                  sx={{
                    borderRadius: 2.5,
                    '& .MuiOutlinedInput-root': { backgroundColor: '#fafafa' },
                  }}
                />
              )}
            />

            {/* Borrowed Part TextField */}
            <TextField
              label="Phụ tùng"
              value={borrowedItem}
              onChange={(e) => setBorrowedItem(e.target.value)}
              variant="outlined"
              sx={{
                width: '100%',
                borderRadius: 2.5,
                '& .MuiOutlinedInput-root': { backgroundColor: '#fafafa' },
              }}
            />

            {/* Status TextField */}
            <TextField
              select
              label="Trạng thái"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{
                width: '100%',
                borderRadius: 2.5,
                '& .MuiOutlinedInput-root': { backgroundColor: '#fafafa' },
              }}
            >
              <MenuItem value="Chưa trả">Chưa trả</MenuItem>
              <MenuItem value="Đã trả">Đã trả</MenuItem>
            </TextField>

            {/* Time TextField (giữ lại thời gian của bạn) */}
            <TextField
              label="Thời gian mượ̣n"
              type="datetime-local"
              value={borrowTime}
              onChange={(e) => setBorrowTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                width: '100%',
                borderRadius: 2.5,
                '& .MuiOutlinedInput-root': { backgroundColor: '#fafafa' },
              }}
            />

            {/* Add Button */}
            <Button
              variant="contained"
              onClick={handleBorrow}
              sx={{
                borderRadius: 2.5,
                backgroundColor: '#1976d2',
                '&:hover': { backgroundColor: '#115293' },
                fontWeight: 800,
                paddingY: 1.2,
                textTransform: 'none',
                whiteSpace: 'nowrap',
                justifySelf: { xs: 'start', md: 'end' },
                px: 3,
              }}
            >
              Thêm
            </Button>
          </Box>
        </Box>

        {/* ===== TABLE ===== */}
        <TableContainer
          sx={{
            backgroundColor: '#fff',
            borderRadius: 3,
            boxShadow: 1,
            border: '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >
          <Table
            sx={{
              minWidth: 650,
              '& th': { fontSize: 13, fontWeight: 800 },
              '& td': { fontSize: 14 },
            }}
          >
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1976d2' }}>
                <TableCell sx={{ color: '#fff' }}>Thợ</TableCell>
                <TableCell sx={{ color: '#fff' }}>Phụ tùng</TableCell>
                <TableCell sx={{ color: '#fff' }}>Trạng thái</TableCell>
                <TableCell sx={{ color: '#fff' }}>Thời gian mượ̣n</TableCell>
                <TableCell sx={{ color: '#fff' }}></TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {borrowedWorkers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#6b7280' }}>
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              ) : (
                borrowedWorkers.map((item) => {
                  const isReturned = item.status === 'Đã trả';
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.borrowedParts}</TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell>{item.time}</TableCell>
                      <TableCell>
                        <Button
                          color="error"
                          disabled={isReturned}
                          onClick={() => handleDelete(item.id)}
                          sx={{
                            borderRadius: 2,
                            fontWeight: 800,
                            textTransform: 'none',
                            px: 2,
                            py: 0.8,
                            opacity: isReturned ? 0.55 : 1,
                          }}
                        >
                          {isReturned ? 'Đã trả' : 'Xoá'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default ManageBorrow;
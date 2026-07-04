import React from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Delete,
  Edit,
  Error,
  History,
  LocationOn,
  ReceiptLong,
  Schedule,
} from '@mui/icons-material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import dayjs from 'dayjs';
import { filterDisplayedCars, getSupervisorsFromCars } from '../../utils/carListHelpers';
import { getAvailableStatusTransitions, getConditionConfig } from '../../utils/carStatusConfig';
import FilterPanel from '../common/FilterPanel';

const getWorkerNames = (car, role) => {
  const names = car.workers
    .filter((w) => w.role === role)
    .map((w) => w.worker?.name)
    .filter(Boolean);

  return names.length > 0 ? (
    names.map((name, index) => (
      <React.Fragment key={index}>
        - {name}
        {index !== names.length - 1 && <br />}
      </React.Fragment>
    ))
  ) : (
    <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>Trống</span>
  );
};

const CarActions = ({
  car,
  canManage,
  canDelete,
  onLoadRepairItems,
  onEdit,
  onDelete,
  onOpenHistory,
}) => (
  <Box sx={{ display: 'flex', gap: 0.5 }}>
    <Tooltip title="Chi tiết lệnh sửa chữa (API + công việc ngoài báo giá)">
      <span>
        <IconButton size="small" color="info" onClick={() => onLoadRepairItems(car)} sx={{ borderRadius: 2 }}>
          <ReceiptLong />
        </IconButton>
      </span>
    </Tooltip>
    {canManage && (
      <Tooltip title="Sửa xe">
        <span>
          <IconButton size="small" color="primary" onClick={() => onEdit(car)} sx={{ borderRadius: 2 }}>
            <Edit />
          </IconButton>
        </span>
      </Tooltip>
    )}
    {canDelete && (
      <Tooltip title="Xoá xe">
        <span>
          <IconButton size="small" color="error" onClick={() => onDelete(car._id)} sx={{ borderRadius: 2 }}>
            <Delete />
          </IconButton>
        </span>
      </Tooltip>
    )}
    {canManage && (
      <Tooltip title="Lịch sử thay đổi thợ">
        <span>
          <IconButton size="small" color="secondary" onClick={() => onOpenHistory(car)} sx={{ borderRadius: 2 }}>
            <History />
          </IconButton>
        </span>
      </Tooltip>
    )}
  </Box>
);

const CarCard = ({
  car,
  canManage,
  canDelete,
  getStatusConfig,
  renderStatusIcon,
  onStatusChange,
  onLoadRepairItems,
  onEdit,
  onDelete,
  onOpenHistory,
}) => (
  <Card key={car._id} sx={{ mb: 1.5, borderRadius: 3, border: (car.isLate || car.overdue) ? '2px solid #f44336' : undefined }}>
    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {(car.isLate || car.overdue) && (
            <Tooltip title="Xe trễ hẹn"><Error color="error" fontSize="medium" /></Tooltip>
          )}
          <Typography variant="h6" color={(car.isLate || car.overdue) ? 'error' : 'primary'}>
            {car.plateNumber}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={renderStatusIcon(car.status)}
            label={getStatusConfig(car.status).label}
            color={getStatusConfig(car.status).color}
            size="small"
          />
          {(car.isLate || car.overdue) && <Chip label="Trễ hẹn" color="error" size="small" icon={<Error />} />}
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="body2" color="textSecondary">
            <strong>Loại xe:</strong> {car.externalCarTypeName || 'Chưa xác định'}
          </Typography>
          <Typography variant="body2" color="textSecondary" component="span">
            <strong>Tình trạng:</strong>
            <Chip
              label={getConditionConfig(car.condition).label}
              color={getConditionConfig(car.condition).color}
              size="small"
              sx={{ ml: 1 }}
            />
          </Typography>
          <Typography variant="body2" color="textSecondary">
            <strong>Thời gian giao:</strong> {car.deliveryTime || 'Chưa xác định'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            <strong>Địa điểm:</strong> {car.location?.name || 'Chưa xác định'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            <strong>Giám sát:</strong> {car.supervisor?.name || '---'}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="body2" color="textSecondary"><strong>Thợ chính:</strong></Typography>
          <Box sx={{ ml: 1, mb: 1 }}>{getWorkerNames(car, 'main')}</Box>
          <Typography variant="body2" color="textSecondary"><strong>Thợ phụ:</strong></Typography>
          <Box sx={{ ml: 1 }}>{getWorkerNames(car, 'sub')}</Box>
        </Grid>
      </Grid>
    </CardContent>

    <Divider />

    <CardActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, px: 1 }}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flex: 1 }}>
        {canManage && getAvailableStatusTransitions(car.status).map((status) => (
          <Button
            key={status}
            size="small"
            variant="outlined"
            startIcon={renderStatusIcon(status)}
            onClick={() => onStatusChange(car, status)}
            sx={{ textTransform: 'none', minWidth: 0, px: 1 }}
          >
            {getStatusConfig(status).label}
          </Button>
        ))}
      </Box>
      <CarActions
        car={car}
        canManage={canManage}
        canDelete={canDelete}
        onLoadRepairItems={onLoadRepairItems}
        onEdit={onEdit}
        onDelete={onDelete}
        onOpenHistory={onOpenHistory}
      />
    </CardActions>
  </Card>
);

const CarTable = ({
  cars,
  hideSearch,
  filterDate,
  searchPlate,
  tableSupervisor,
  onSearchPlateChange,
  onTableSupervisorChange,
  canManage,
  canDelete,
  getStatusConfig,
  renderStatusIcon,
  onStatusChange,
  onLoadRepairItems,
  onEdit,
  onDelete,
  onOpenHistory,
}) => {
  const sortedCars = filterDisplayedCars({
    cars,
    filterDate,
    searchPlate,
    tableSupervisor,
    hideSearch,
  });

  return (
    <Paper variant="outlined" sx={{ width: '100%', overflowX: 'auto', borderRadius: 3 }}>
      {!hideSearch && (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', p: 2 }}>
          <TextField
            label="Tìm kiếm biển số xe"
            variant="outlined"
            size="small"
            value={searchPlate}
            onChange={(e) => onSearchPlateChange(e.target.value)}
            sx={{ maxWidth: 250, width: '100%' }}
          />
          <FormControl sx={{ minWidth: 180, maxWidth: 250, width: '100%' }} size="small">
            <InputLabel>Chọn giám sát</InputLabel>
            <Select
              value={tableSupervisor}
              label="Chọn giám sát"
              onChange={(e) => onTableSupervisorChange(e.target.value)}
            >
              <MenuItem value="">Tất cả giám sát</MenuItem>
              {getSupervisorsFromCars(cars).map((sup) => (
                <MenuItem key={sup._id} value={sup._id}>{sup.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      <Table stickyHeader sx={{ minWidth: 1100 }}>
        <TableHead>
          <TableRow sx={{ background: '#f5f5f5' }}>
            {['Biển số', 'Loại xe', 'Tình trạng', 'Trạng thái', 'Thợ chính', 'Thợ phụ', 'Thời gian giao', 'Địa điểm', 'Giám sát', 'Chuyển trạng thái', 'Thao tác'].map((label) => (
              <TableCell key={label} sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>{label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedCars.map((car, idx) => {
            const isLate = car.isLate || car.overdue;
            return (
              <TableRow
                key={car._id}
                sx={{
                  backgroundColor: isLate ? '#ffebee' : (idx % 2 === 0 ? '#fafafa' : '#fff'),
                  transition: 'background 0.2s',
                  '&:hover': { backgroundColor: isLate ? '#ffcdd2' : '#e3f2fd' },
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isLate && <Tooltip title="Xe trễ hẹn"><Error color="error" fontSize="small" /></Tooltip>}
                    <Typography variant="body2" fontWeight="bold" color={isLate ? 'error' : 'primary'}>
                      {car.plateNumber}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{car.externalCarTypeName || 'Chưa xác định'}</TableCell>
                <TableCell>
                  <Chip
                    label={getConditionConfig(car.condition).label}
                    color={getConditionConfig(car.condition).color}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      icon={renderStatusIcon(car.status)}
                      label={getStatusConfig(car.status).label}
                      color={getStatusConfig(car.status).color}
                      size="small"
                    />
                    {isLate && <Chip label="Trễ hẹn" color="error" size="small" icon={<Error />} />}
                  </Box>
                </TableCell>
                <TableCell>{getWorkerNames(car, 'main')}</TableCell>
                <TableCell>{getWorkerNames(car, 'sub')}</TableCell>
                <TableCell>{car.deliveryTime || 'Chưa xác định'}</TableCell>
                <TableCell>{car.location?.name || 'Chưa xác định'}</TableCell>
                <TableCell>{car.supervisor?.name || '---'}</TableCell>
                <TableCell>
                  {canManage ? (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {getAvailableStatusTransitions(car.status).map((status) => (
                        <Tooltip key={status} title={`Chuyển sang ${getStatusConfig(status).label}`}>
                          <IconButton
                            size="small"
                            color={getStatusConfig(status).color}
                            onClick={() => onStatusChange(car, status)}
                            sx={{ borderRadius: 2 }}
                          >
                            {renderStatusIcon(status)}
                          </IconButton>
                        </Tooltip>
                      ))}
                    </Box>
                  ) : (
                    <Chip label={getStatusConfig(car.status).label} size="small" color={getStatusConfig(car.status).color} />
                  )}
                </TableCell>
                <TableCell>
                  <CarActions
                    car={car}
                    canManage={canManage}
                    canDelete={canDelete}
                    onLoadRepairItems={onLoadRepairItems}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onOpenHistory={onOpenHistory}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
};

const CarsPanel = ({
  hideSearch = false,
  isMobile,
  displayedCars,
  locations,
  selectedLocation,
  onLocationChange,
  filterDate,
  onFilterDateChange,
  onClearFilterDate,
  searchPlate,
  onSearchPlateChange,
  tableSupervisor,
  onTableSupervisorChange,
  canManage,
  canDelete,
  getStatusConfig,
  renderStatusIcon,
  onStatusChange,
  onLoadRepairItems,
  onEdit,
  onDelete,
  onOpenHistory,
}) => {
  const filteredCars = filterDisplayedCars({
    cars: displayedCars,
    filterDate,
    searchPlate,
    tableSupervisor,
    hideSearch: isMobile ? hideSearch : true,
  });

  return (
    <>
      {!hideSearch && (
        <FilterPanel>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel><LocationOn sx={{ mr: 1 }} fontSize="small" />Địa điểm</InputLabel>
                <Select
                  value={selectedLocation}
                  onChange={(e) => onLocationChange(e.target.value)}
                  label={<><LocationOn sx={{ mr: 1 }} fontSize="small" />Địa điểm</>}
                >
                  <MenuItem value="all">
                    <Typography variant="body2" fontWeight="bold">Tất cả địa điểm</Typography>
                  </MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location._id} value={location._id}>{location.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label={<><Schedule sx={{ mr: 1 }} fontSize="small" />Ngày nhận xe</>}
                type="date"
                size="small"
                fullWidth
                value={filterDate ? dayjs(filterDate).format('YYYY-MM-DD') : ''}
                onChange={(e) => onFilterDateChange(e.target.value ? dayjs(e.target.value).toDate() : null)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={onClearFilterDate}
                disabled={!filterDate}
                startIcon={<Delete />}
              >
                Xoá lọc ngày
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <Paper elevation={0} sx={{ p: 1, textAlign: 'center', background: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="body2" fontWeight="bold" color="primary">
                  <DirectionsCarIcon fontSize="small" sx={{ mr: 1 }} />Tổng cộng
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {displayedCars.length} xe
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </FilterPanel>
      )}

      {!hideSearch && isMobile && (
        <Box sx={{ mb: 2 }}>
          <Stack spacing={2} direction="column">
            <TextField
              label="Tìm kiếm biển số xe"
              variant="outlined"
              size="small"
              value={searchPlate}
              onChange={(e) => onSearchPlateChange(e.target.value)}
              fullWidth
            />
            <FormControl fullWidth size="small">
              <InputLabel>Chọn giám sát</InputLabel>
              <Select
                value={tableSupervisor}
                label="Chọn giám sát"
                onChange={(e) => onTableSupervisorChange(e.target.value)}
              >
                <MenuItem value="">Tất cả giám sát</MenuItem>
                {getSupervisorsFromCars(displayedCars).map((sup) => (
                  <MenuItem key={sup._id} value={sup._id}>{sup.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Box>
      )}

      {isMobile ? (
        <Box>
          {filteredCars.map((car) => (
            <CarCard
              key={car._id}
              car={car}
              canManage={canManage}
              canDelete={canDelete}
              getStatusConfig={getStatusConfig}
              renderStatusIcon={renderStatusIcon}
              onStatusChange={onStatusChange}
              onLoadRepairItems={onLoadRepairItems}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpenHistory={onOpenHistory}
            />
          ))}
        </Box>
      ) : (
        <CarTable
          cars={displayedCars}
          hideSearch={hideSearch}
          filterDate={filterDate}
          searchPlate={searchPlate}
          tableSupervisor={tableSupervisor}
          onSearchPlateChange={onSearchPlateChange}
          onTableSupervisorChange={onTableSupervisorChange}
          canManage={canManage}
          canDelete={canDelete}
          getStatusConfig={getStatusConfig}
          renderStatusIcon={renderStatusIcon}
          onStatusChange={onStatusChange}
          onLoadRepairItems={onLoadRepairItems}
          onEdit={onEdit}
          onDelete={onDelete}
          onOpenHistory={onOpenHistory}
        />
      )}
    </>
  );
};

export default CarsPanel;

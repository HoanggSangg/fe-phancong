import { useCallback, useMemo, useRef, useState } from 'react';
import {
  assignRepairItemWorkers,
  getCarRepairItems,
  saveManualRepairItems,
} from '../components/apis/index';
import useRevenueSettings from './queries/useRevenueSettings';
import {
  mapRepairItemToState,
  createEmptyManualItem,
  isItemWorkerPercentageValid,
  getItemWorkerTotalPercentage,
} from '../utils/manageCarsHelpers';

const useRepairItems = ({ allWorkers, ensureAllWorkers, setSnackbar }) => {
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [repairCar, setRepairCar] = useState(null);
  const [repairItems, setRepairItems] = useState([]);
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairSaving, setRepairSaving] = useState(false);
  const initialManualCountRef = useRef(0);

  const { data: revenueSettings } = useRevenueSettings(repairDialogOpen);
  const revenueBase = revenueSettings?.revenueBase || 'amount';

  const workersById = useMemo(
    () => Object.fromEntries((allWorkers || []).map((worker) => [worker._id, worker])),
    [allWorkers]
  );

  const apiRepairItems = useMemo(
    () => repairItems.filter((item) => !item.isManual),
    [repairItems]
  );

  const manualRepairItems = useMemo(
    () => repairItems.filter((item) => item.isManual),
    [repairItems]
  );

  const handleLoadRepairItems = useCallback(async (car) => {
    try {
      setRepairCar(car);
      setRepairLoading(true);
      setRepairDialogOpen(true);
      setRepairItems([]);

      if (ensureAllWorkers) {
        await ensureAllWorkers();
      }

      const itemsRes = await getCarRepairItems(car._id);
      const mappedItems = (itemsRes.data || []).map(mapRepairItemToState);
      initialManualCountRef.current = mappedItems.filter((item) => item.isManual).length;
      setRepairItems(mappedItems);
    } catch (err) {
      console.error('Lỗi khi tải chi tiết sửa chữa:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Không tải được chi tiết sửa chữa',
        severity: 'error',
      });
      setRepairDialogOpen(false);
    } finally {
      setRepairLoading(false);
    }
  }, [ensureAllWorkers, setSnackbar]);

  const handleRepairWorkerChange = useCallback((itemId, rowIndex, worker) => {
    setRepairItems((prev) =>
      prev.map((item) =>
        item._id === itemId
          ? {
              ...item,
              selectedWorkers: item.selectedWorkers.map((entry, index) =>
                index === rowIndex ? { ...entry, worker } : entry
              ),
            }
          : item
      )
    );
  }, []);

  const handleRepairPercentageChange = useCallback((itemId, rowIndex, percentage) => {
    setRepairItems((prev) =>
      prev.map((item) =>
        item._id === itemId
          ? {
              ...item,
              selectedWorkers: item.selectedWorkers.map((entry, index) =>
                index === rowIndex
                  ? { ...entry, percentage: Math.min(100, Math.max(0, Number(percentage) || 0)) }
                  : entry
              ),
            }
          : item
      )
    );
  }, []);

  const handleAddRepairWorkerRow = useCallback((itemId) => {
    setRepairItems((prev) =>
      prev.map((item) =>
        item._id === itemId
          ? {
              ...item,
              selectedWorkers: [...item.selectedWorkers, { worker: null, percentage: 0 }],
            }
          : item
      )
    );
  }, []);

  const handleRemoveRepairWorkerRow = useCallback((itemId, rowIndex) => {
    setRepairItems((prev) =>
      prev.map((item) => {
        if (item._id !== itemId) return item;
        if (item.selectedWorkers.length <= 1) {
          return {
            ...item,
            selectedWorkers: [{ worker: null, percentage: 100 }],
          };
        }
        return {
          ...item,
          selectedWorkers: item.selectedWorkers.filter((_, index) => index !== rowIndex),
        };
      })
    );
  }, []);

  const handleManualFieldChange = useCallback((itemId, field, value) => {
    setRepairItems((prev) =>
      prev.map((item) => {
        if (item._id !== itemId) return item;
        const next = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          next.amount = Math.round(
            (Number(next.quantity) || 0) * (Number(next.unitPrice) || 0)
          );
        }
        if (field === 'quantity' || field === 'unitCostPrice') {
          next.costAmount = Math.round(
            (Number(next.quantity) || 0) * (Number(next.unitCostPrice) || 0)
          );
        }
        if (field === 'amount') {
          next.amount = Math.max(Number(value) || 0, 0);
        }
        if (field === 'costAmount') {
          next.costAmount = Math.max(Number(value) || 0, 0);
        }
        return next;
      })
    );
  }, []);

  const handleAddManualItem = useCallback(() => {
    setRepairItems((prev) => [...prev, createEmptyManualItem()]);
  }, []);

  const handleRemoveManualItem = useCallback((itemId) => {
    setRepairItems((prev) => prev.filter((item) => item._id !== itemId));
  }, []);

  const buildWorkersPayload = useCallback((item) =>
    item.selectedWorkers
      .filter((entry) => entry.worker)
      .map((entry) => ({
        workerId: entry.worker._id,
        percentage: Number(entry.percentage) || 0,
      })), []);

  const handleSaveRepairAssignments = useCallback(async () => {
    if (!repairCar) return;

    const invalidPercentItem = repairItems.find((item) => !isItemWorkerPercentageValid(item));
    if (invalidPercentItem) {
      setSnackbar({
        open: true,
        message: `Hạng mục "${invalidPercentItem.content || '—'}": tổng % thợ không được vượt quá 100 (hiện tại: ${getItemWorkerTotalPercentage(invalidPercentItem)}%)`,
        severity: 'error',
      });
      return;
    }

    const invalidManualItem = manualRepairItems.find((item) => !String(item.content || '').trim());
    if (invalidManualItem) {
      setSnackbar({
        open: true,
        message: 'Vui lòng nhập nội dung cho công việc ngoài báo giá',
        severity: 'error',
      });
      return;
    }

    try {
      setRepairSaving(true);

      if (apiRepairItems.length > 0) {
        await assignRepairItemWorkers(
          repairCar._id,
          apiRepairItems.map((item) => ({
            itemId: item._id,
            workers: buildWorkersPayload(item),
          }))
        );
      }

      const shouldSaveManual = manualRepairItems.length > 0 || initialManualCountRef.current > 0;
      const res = shouldSaveManual
        ? await saveManualRepairItems(
          repairCar._id,
          manualRepairItems.map((item) => ({
            _id: item._id,
            groupName: item.groupName,
            content: item.content,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            unitCostPrice: item.unitCostPrice,
            costAmount: item.costAmount,
            unit: item.unit,
            workers: buildWorkersPayload(item),
          }))
        )
        : { data: null };

      if (res.data) {
        setRepairItems((res.data || []).map(mapRepairItemToState));
        initialManualCountRef.current = (res.data || []).filter((item) => item.isManual).length;
      }

      setSnackbar({
        open: true,
        message: 'Đã lưu phân công thợ và công việc ngoài báo giá',
        severity: 'success',
      });
    } catch (err) {
      console.error('Lỗi khi lưu phân công:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Lưu phân công thất bại',
        severity: 'error',
      });
    } finally {
      setRepairSaving(false);
    }
  }, [
    repairCar,
    repairItems,
    manualRepairItems,
    apiRepairItems,
    buildWorkersPayload,
    setSnackbar,
  ]);

  return {
    repairDialogOpen,
    setRepairDialogOpen,
    repairCar,
    repairItems,
    repairLoading,
    repairSaving,
    workersById,
    apiRepairItems,
    manualRepairItems,
    revenueBase,
    handleLoadRepairItems,
    handleRepairWorkerChange,
    handleRepairPercentageChange,
    handleAddRepairWorkerRow,
    handleRemoveRepairWorkerRow,
    handleManualFieldChange,
    handleAddManualItem,
    handleRemoveManualItem,
    handleSaveRepairAssignments,
  };
};

export default useRepairItems;

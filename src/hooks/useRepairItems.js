import { useCallback, useMemo, useRef, useState } from 'react';
import {
  saveRepairAssignments,
  getCarRepairItems,
  getWorkerGroups,
  syncCarFromExternal,
} from '../components/apis/index';
import useRevenueSettings from './queries/useRevenueSettings';
import {
  mapRepairItemToState,
  createEmptyManualItem,
  isItemWorkerPercentageValid,
  getItemWorkerTotalPercentage,
  buildChangedRepairPayload,
} from '../utils/manageCarsHelpers';

const pickSavedCar = (res) => res?.data?.car || null;

/** setSnackbar: legacy ({ open, message, severity }) — dùng toast.fromSnackbar */
const useRepairItems = ({ allWorkers, ensureAllWorkers, setSnackbar, onCarCompleted }) => {
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [repairCar, setRepairCar] = useState(null);
  const [repairItems, setRepairItems] = useState([]);
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairSaving, setRepairSaving] = useState(false);
  const [syncExternalLoading, setSyncExternalLoading] = useState(false);
  const [workerGroups, setWorkerGroups] = useState([]);
  const initialItemsRef = useRef([]);

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

      const itemsRes = await getCarRepairItems(car._id);
      const mappedItems = (itemsRes.data || []).map(mapRepairItemToState);
      initialItemsRef.current = mappedItems;
      setRepairItems(mappedItems);
      setRepairLoading(false);

      if (ensureAllWorkers) {
        ensureAllWorkers().catch(() => {});
      }
      getWorkerGroups()
        .then((groupsRes) => {
          const groups = Array.isArray(groupsRes.data)
            ? groupsRes.data
            : (groupsRes.data?.data || []);
          setWorkerGroups(groups);
        })
        .catch(() => setWorkerGroups([]));
    } catch (err) {
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

  const handleSyncExternal = useCallback(async () => {
    if (!repairCar?._id || repairSaving || syncExternalLoading) return;
    setSyncExternalLoading(true);
    try {
      const res = await syncCarFromExternal(repairCar._id);
      const car = res.data?.car || repairCar;
      setRepairCar(car);
      const itemsRes = await getCarRepairItems(car._id);
      const refreshed = (itemsRes.data || []).map(mapRepairItemToState);
      initialItemsRef.current = [
        ...refreshed.filter((item) => !item.isManual),
        ...initialItemsRef.current.filter((item) => item.isManual),
      ];
      setRepairItems((previous) => {
        const previousById = new Map(previous.map((item) => [item._id, item]));
        return [
          ...refreshed.filter((item) => !item.isManual).map((item) => {
            const draft = previousById.get(item._id);
            return draft ? { ...item, selectedWorkers: draft.selectedWorkers } : item;
          }),
          // Keep unsaved manual edits, additions and removals in the current dialog.
          ...previous.filter((item) => item.isManual),
        ];
      });
      if (onCarCompleted) await onCarCompleted(car);
      setSnackbar({ open: true, message: res.data?.message || 'Đã tải lại dữ liệu từ API', severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Không tải được dữ liệu từ API',
        severity: 'error',
      });
    } finally {
      setSyncExternalLoading(false);
    }
  }, [repairCar, repairSaving, syncExternalLoading, onCarCompleted, setSnackbar]);

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

  const handleApplyWorkerGroup = useCallback((itemId, group) => {
    if (!group) return;

    const selectedWorkers = (group.members || [])
      .map((entry) => {
        const workerId = String(entry.worker?._id || entry.worker || '');
        const worker = workersById[workerId]
          || (entry.worker && entry.worker.name ? entry.worker : null);
        if (!worker) return null;
        return {
          worker,
          percentage: Math.min(100, Math.max(0, Number(entry.percentage) || 0)),
        };
      })
      .filter(Boolean);

    setRepairItems((prev) =>
      prev.map((item) =>
        item._id === itemId
          ? {
              ...item,
              selectedWorkers: selectedWorkers.length
                ? selectedWorkers
                : [{ worker: null, percentage: 100 }],
            }
          : item
      )
    );
  }, [workersById]);

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

  const handleSaveRepairAssignments = useCallback(async () => {
    if (!repairCar || repairSaving || syncExternalLoading) return;
    const payload = buildChangedRepairPayload(repairItems, initialItemsRef.current);
    if (!payload.assignments.length && payload.manualItems === undefined) {
      setSnackbar({ open: true, message: 'Không có thay đổi cần lưu', severity: 'info' });
      return;
    }
    const changedIds = new Set(payload.assignments.map((item) => item.itemId));
    const changedItems = repairItems.filter((item) => item.isManual
      ? payload.manualItems !== undefined : changedIds.has(item._id));

    const invalidPercentItem = changedItems.find((item) => !isItemWorkerPercentageValid(item));
    if (invalidPercentItem) {
      setSnackbar({
        open: true,
        message: `Hạng mục "${invalidPercentItem.content || '—'}": tổng % thợ không được vượt quá 100 (hiện tại: ${getItemWorkerTotalPercentage(invalidPercentItem)}%)`,
        severity: 'error',
      });
      return;
    }

    const invalidManualItem = changedItems.find((item) => item.isManual && !String(item.content || '').trim());
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

      const response = await saveRepairAssignments(repairCar._id, payload);
      const savedCar = pickSavedCar(response);

      setRepairDialogOpen(false);
      setRepairCar(null);
      setRepairItems([]);

      setSnackbar({
        open: true,
        message: 'Đã lưu phân công',
        severity: 'success',
      });

      if (onCarCompleted) {
        await onCarCompleted(savedCar || repairCar);
      }
    } catch (err) {
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
    repairSaving,
    syncExternalLoading,
    setSnackbar,
    onCarCompleted,
  ]);

  return {
    repairDialogOpen,
    setRepairDialogOpen,
    repairCar,
    repairItems,
    repairLoading,
    repairSaving,
    syncExternalLoading,
    handleSyncExternal,
    workersById,
    apiRepairItems,
    manualRepairItems,
    revenueBase,
    workerGroups,
    handleLoadRepairItems,
    handleRepairWorkerChange,
    handleRepairPercentageChange,
    handleAddRepairWorkerRow,
    handleRemoveRepairWorkerRow,
    handleApplyWorkerGroup,
    handleManualFieldChange,
    handleAddManualItem,
    handleRemoveManualItem,
    handleSaveRepairAssignments,
  };
};

export default useRepairItems;

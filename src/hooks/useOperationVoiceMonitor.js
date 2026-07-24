import { useCallback, useEffect, useRef, useState } from 'react';
import { getOperationLogs } from '../components/apis';
import { getTodayDate } from '../utils/dateFilters';
import {
  alertNewOperationLogs,
  filterCarOperationLogs,
  filterVoiceAlertLogs,
  initOperationVoiceSetting,
  isOperationVoiceEnabled,
  isVoiceAlertLog,
  setOperationVoiceEnabled,
  speakOperationLog,
  speakPlainText,
  unlockOperationAudio,
} from '../utils/operationAlertSound';

const POLL_INTERVAL_MS = 15_000;

const useOperationVoiceMonitor = ({ poll = true, pollReady = true, onNewCarLogs } = {}) => {
  const [voiceEnabled, setVoiceEnabled] = useState(() => initOperationVoiceSetting());
  const [latestLog, setLatestLog] = useState(null);
  const knownLogIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);
  const onNewCarLogsRef = useRef(onNewCarLogs);

  useEffect(() => {
    onNewCarLogsRef.current = onNewCarLogs;
  }, [onNewCarLogs]);

  useEffect(() => {
    setOperationVoiceEnabled(voiceEnabled);
  }, [voiceEnabled]);

  useEffect(() => {
    unlockOperationAudio();
  }, []);

  const processLogs = useCallback((items, { announceNew = false } = {}) => {
    const nextItems = items || [];
    const voiceLogs = filterVoiceAlertLogs(nextItems);
    if (voiceLogs[0]) setLatestLog(voiceLogs[0]);

    if (announceNew && initialLoadDoneRef.current) {
      const newItems = nextItems.filter((item) => !knownLogIdsRef.current.has(item._id));
      const newCarLogs = filterCarOperationLogs(newItems);

      if (newCarLogs.length > 0 && onNewCarLogsRef.current) {
        onNewCarLogsRef.current(newCarLogs);
      }

      if (isOperationVoiceEnabled()) {
        const newLogs = filterVoiceAlertLogs(newItems);
        if (newLogs.length > 0) {
          alertNewOperationLogs(newLogs.slice().reverse());
        }
      }
    }

    knownLogIdsRef.current = new Set(nextItems.map((item) => item._id));
    initialLoadDoneRef.current = true;
  }, []);

  const resetTracking = useCallback(() => {
    initialLoadDoneRef.current = false;
    knownLogIdsRef.current = new Set();
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      setOperationVoiceEnabled(next);
      unlockOperationAudio();

      if (next) {
        if (latestLog && isVoiceAlertLog(latestLog)) {
          speakOperationLog(latestLog);
        } else {
          speakPlainText('Đã bật đọc thao tác xe và thợ');
        }
      }

      return next;
    });
  }, [latestLog]);

  const testVoice = useCallback(() => {
    unlockOperationAudio();
    if (latestLog && isVoiceAlertLog(latestLog)) {
      speakOperationLog(latestLog);
      return;
    }
    speakPlainText('Đã sẵn sàng đọc thao tác xe và thợ');
  }, [latestLog]);

  useEffect(() => {
    if (!poll || !pollReady) return undefined;

    const today = getTodayDate();

    const fetchVoiceLogs = async () => {
      try {
        const res = await getOperationLogs({
          from: today,
          to: today,
          page: 1,
          limit: 30,
        });
        processLogs(res.data?.items, { announceNew: true });
      } catch {
        // Bỏ qua khi không có quyền hoặc lỗi mạng
      }
    };

    fetchVoiceLogs();
    const timer = window.setInterval(fetchVoiceLogs, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [poll, pollReady, processLogs]);

  return {
    voiceEnabled,
    latestLog,
    processLogs,
    resetTracking,
    toggleVoice,
    testVoice,
  };
};

export default useOperationVoiceMonitor;

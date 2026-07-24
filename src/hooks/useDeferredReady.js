import { useEffect, useState } from 'react';

/**
 * Chỉ bật true sau khi `enabled` và browser rảnh (hoặc hết delay).
 * Dùng để trì hoãn API phụ: filter, poll, marquee, notification...
 */
const useDeferredReady = (enabled = true, delayMs = 400) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return undefined;
    }

    let cancelled = false;
    let idleId;
    let timeoutId;

    const markReady = () => {
      if (!cancelled) setReady(true);
    };

    const scheduleIdle = () => {
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(markReady, { timeout: 2000 });
      } else {
        timeoutId = window.setTimeout(markReady, 50);
      }
    };

    if (delayMs > 0) {
      timeoutId = window.setTimeout(scheduleIdle, delayMs);
    } else {
      scheduleIdle();
    }

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      if (
        idleId != null
        && typeof window !== 'undefined'
        && typeof window.cancelIdleCallback === 'function'
      ) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [enabled, delayMs]);

  return Boolean(enabled && ready);
};

export default useDeferredReady;

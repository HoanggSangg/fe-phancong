import { useEffect, useState } from 'react';

/**
 * true khi tab đang hiện; false khi ẩn (để tạm dừng poll).
 */
const usePageVisible = () => {
  const [visible, setVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  );

  useEffect(() => {
    const onVisibility = () => {
      setVisible(document.visibilityState !== 'hidden');
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return visible;
};

export default usePageVisible;

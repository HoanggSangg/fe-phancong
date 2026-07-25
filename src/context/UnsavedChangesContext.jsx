import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const UnsavedChangesContext = createContext(null);

export const UnsavedChangesProvider = ({ children }) => {
  const [keys, setKeys] = useState(() => new Set());

  const setHasUnsavedChanges = useCallback((value, key = 'default') => {
    const id = String(key || 'default');
    setKeys((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      if (next.size === prev.size) {
        let same = true;
        next.forEach((item) => {
          if (!prev.has(item)) same = false;
        });
        if (same) return prev;
      }
      return next;
    });
  }, []);

  const clearAllUnsavedChanges = useCallback(() => {
    setKeys(new Set());
  }, []);

  const value = useMemo(
    () => ({
      hasUnsavedChanges: keys.size > 0,
      unsavedKeys: keys,
      setHasUnsavedChanges,
      clearAllUnsavedChanges,
    }),
    [keys, setHasUnsavedChanges, clearAllUnsavedChanges],
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
};

export const useUnsavedChanges = () => {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider');
  }
  return ctx;
};

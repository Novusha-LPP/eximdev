import React, { createContext, useContext, useState, useCallback } from 'react';

const TableRefreshContext = createContext();

export const useTableRefresh = () => {
  const context = useContext(TableRefreshContext);
  if (!context) {
    throw new Error('useTableRefresh must be used within a TableRefreshProvider');
  }
  return context;
};

export const TableRefreshProvider = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshCallbacks, setRefreshCallbacks] = useState(new Map());

  const registerRefreshCallback = useCallback((id, callback) => {
    setRefreshCallbacks(prev => new Map(prev).set(id, callback));
    
    // Return cleanup function
    return () => {
      setRefreshCallbacks(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    };
  }, []);

  const refreshTable = useCallback((tableId = 'default') => {
    setRefreshTrigger(prev => prev + 1);
    
    // Call specific table refresh callback if registered
    const callback = refreshCallbacks.get(tableId);
    if (callback) {
      callback();
    }
    
    // Also call all registered callbacks if no specific table ID
    if (tableId === 'all') {
      refreshCallbacks.forEach(callback => callback());
    }
  }, [refreshCallbacks]);

  const triggerRowUpdate = useCallback((rowId, updates) => {
    // Trigger a specific row update
    setRefreshTrigger(prev => prev + 1);
    
    // Dispatch custom event for immediate DOM updates
    window.dispatchEvent(new CustomEvent('tableRowUpdate', {
      detail: { rowId, updates, timestamp: Date.now() }
    }));
  }, []);

  const value = {
    refreshTrigger,
    refreshTable,
    triggerRowUpdate,
    registerRefreshCallback
  };

  return (
    <TableRefreshContext.Provider value={value}>
      {children}
    </TableRefreshContext.Provider>
  );
};

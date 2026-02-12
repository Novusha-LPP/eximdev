import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isPageRefresh, reconstructNavigationContext } from '../utils/navigationRecovery';

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    // Instead of throwing an error, return default values
    console.warn('useNavigation must be used within a NavigationProvider. Using fallback navigation.');
    return {
      navigateWithRef: (to) => { window.location.href = to; },
      navigateBack: () => { window.history.back(); return true; },
      clearNavigationStack: () => {},
      canGoBack: window.history.length > 1,
      getPreviousLocation: () => null,
      saveTabState: () => {},
      getTabState: () => 0,
      saveScrollPosition: () => {},
      getScrollPosition: () => 0,
      navigationStack: []
    };
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  // Initialize states from localStorage if available
  const [navigationStack, setNavigationStack] = useState(() => {
    try {
      const saved = localStorage.getItem('kyc-navigation-stack');
      const parsed = saved ? JSON.parse(saved) : [];
      // Only restore recent navigation (last 30 minutes)
      const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
      return parsed.filter(item => item.timestamp > thirtyMinutesAgo);
    } catch {
      return [];
    }
  });
  const [tabStates, setTabStates] = useState(() => {
    try {
      const saved = localStorage.getItem('kyc-tab-states');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [scrollPositions, setScrollPositions] = useState({});
  const location = useLocation();
  const navigate = useNavigate();

  // Persist tab states to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('kyc-tab-states', JSON.stringify(tabStates));
    } catch (error) {
      console.warn('Failed to save tab states to localStorage:', error);
    }
  }, [tabStates]);

  // Persist navigation stack to localStorage (with size limit)
  React.useEffect(() => {
    try {
      // Keep only last 10 navigation items and remove items older than 30 minutes
      const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
      const recentNavigation = navigationStack
        .filter(item => item.timestamp > thirtyMinutesAgo)
        .slice(-10);
      localStorage.setItem('kyc-navigation-stack', JSON.stringify(recentNavigation));
    } catch (error) {
      console.warn('Failed to save navigation stack to localStorage:', error);
    }
  }, [navigationStack]);

  // Handle browser refresh - try to reconstruct navigation context from URL
  React.useEffect(() => {
    // Check if this is a page refresh
    if (isPageRefresh()) {
      console.log('Page refresh detected, attempting to restore navigation context...');
      
      const restored = reconstructNavigationContext();
      if (restored && restored.length > 0) {
        console.log('Restored navigation context:', restored);
        setNavigationStack(restored);
      }
    }
    
    const handlePageShow = (event) => {
      // If page was loaded from cache (back/forward navigation)
      if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        // Try to restore navigation state from localStorage
        try {
          const saved = localStorage.getItem('kyc-navigation-stack');
          if (saved) {
            const parsed = JSON.parse(saved);
            const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
            const recentNavigation = parsed.filter(item => item.timestamp > thirtyMinutesAgo);
            setNavigationStack(recentNavigation);
          }
        } catch (error) {
          console.warn('Failed to restore navigation stack:', error);
        }
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // Debug mode - expose navigation state to window for testing
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.navigationContext = {
        navigationStack,
        tabStates,
        canGoBack: navigationStack.length > 0
      };
    }
  }, [navigationStack, tabStates]);

  // Save the current tab state for a specific route
  const saveTabState = useCallback((route, tabIndex) => {
    setTabStates(prev => {
      const newStates = {
        ...prev,
        [route]: tabIndex
      };
      return newStates;
    });
  }, []);

  // Get the saved tab state for a route
  const getTabState = useCallback((route) => {
    return tabStates[route] || 0;
  }, [tabStates]);

  // Save scroll position for a route
  const saveScrollPosition = useCallback((route, position) => {
    setScrollPositions(prev => ({
      ...prev,
      [route]: position
    }));
  }, []);

  // Get saved scroll position for a route
  const getScrollPosition = useCallback((route) => {
    return scrollPositions[route] || 0;
  }, [scrollPositions]);

  // Navigate to a route and save current location as referrer
  const navigateWithRef = useCallback((to, options = {}) => {
    const currentPath = location.pathname;
    const currentSearch = location.search;
    const fullCurrentPath = currentPath + currentSearch;
    
    // Save current scroll position
    const scrollY = window.scrollY;
    saveScrollPosition(fullCurrentPath, scrollY);
    
    // Add current location to navigation stack
    setNavigationStack(prev => [...prev, {
      path: fullCurrentPath,
      timestamp: Date.now(),
      tabState: tabStates[currentPath] || 0,
      scrollPosition: scrollY
    }]);
    
    navigate(to, options);
  }, [location, navigate, saveScrollPosition, tabStates]);

  // Navigate back to the previous location with state restoration
  const navigateBack = useCallback((fallbackRoute = '/customer-kyc') => {
    console.log('NavigateBack called with stack length:', navigationStack.length);
    
    if (navigationStack.length > 0) {
      const previousLocation = navigationStack[navigationStack.length - 1];
      console.log('Navigating back to:', previousLocation.path);
      
      // Remove the last entry from stack
      setNavigationStack(prev => prev.slice(0, -1));
      
      // Navigate to previous location
      navigate(previousLocation.path, { replace: false });
      
      // Restore scroll position after navigation
      setTimeout(() => {
        window.scrollTo(0, previousLocation.scrollPosition || 0);
      }, 100);
      
      return true;
    } else {
      console.log('No navigation stack, checking browser history...');
      
      // Check if we can use browser history
      if (window.history.length > 1) {
        try {
          // Try to go back using browser history
          window.history.back();
          return true;
        } catch (error) {
          console.warn('Browser back failed, using fallback route:', error);
          navigate(fallbackRoute);
          return false;
        }
      } else {
        // No browser history either, use fallback
        console.log('No browser history, using fallback route:', fallbackRoute);
        navigate(fallbackRoute);
        return false;
      }
    }
  }, [navigationStack, navigate]);

  // Clear navigation stack (useful for logout or major route changes)
  const clearNavigationStack = useCallback(() => {
    setNavigationStack([]);
    setTabStates({});
    setScrollPositions({});
  }, []);

  // Check if there's a previous location to go back to
  const canGoBack = navigationStack.length > 0 || window.history.length > 1;

  // Get the previous location info without navigating
  const getPreviousLocation = useCallback(() => {
    if (navigationStack.length > 0) {
      return navigationStack[navigationStack.length - 1];
    }
    return null;
  }, [navigationStack]);

  // Cleanup function to prevent memory leaks
  const cleanupOldEntries = useCallback(() => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    setNavigationStack(prev => {
      const cleaned = prev.filter(entry => entry.timestamp > oneDayAgo);
      if (cleaned.length !== prev.length) {
        console.log(`Cleaned ${prev.length - cleaned.length} old navigation entries`);
      }
      return cleaned;
    });
    
    // Also cleanup localStorage
    try {
      const saved = localStorage.getItem('kyc-navigation-stack');
      if (saved) {
        const parsed = JSON.parse(saved);
        const cleaned = parsed.filter(entry => entry.timestamp > oneDayAgo);
        if (cleaned.length !== parsed.length) {
          localStorage.setItem('kyc-navigation-stack', JSON.stringify(cleaned));
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup localStorage:', error);
    }
  }, []);

  // Run cleanup periodically
  React.useEffect(() => {
    const cleanup = () => cleanupOldEntries();
    
    // Run cleanup on mount
    cleanup();
    
    // Run cleanup every hour
    const interval = setInterval(cleanup, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [cleanupOldEntries]);

  // Add error boundary protection
  const safeNavigate = useCallback((to, options = {}) => {
    try {
      navigate(to, options);
    } catch (error) {
      console.error('Navigation failed:', error);
      // Fallback: try window.location
      try {
        window.location.href = to;
      } catch (locationError) {
        console.error('Location fallback also failed:', locationError);
      }
    }
  }, [navigate]);

  const value = {
    navigateWithRef,
    navigateBack,
    clearNavigationStack,
    canGoBack,
    getPreviousLocation,
    saveTabState,
    getTabState,
    saveScrollPosition,
    getScrollPosition,
    navigationStack,
    safeNavigate // Add the safe navigate function
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

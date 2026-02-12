// Navigation Recovery Utilities
// Helps recover navigation state after browser refresh

/**
 * Detects if the page was loaded via refresh vs normal navigation
 */
export const isPageRefresh = () => {
  const navigationEntries = performance.getEntriesByType('navigation');
  if (navigationEntries.length > 0) {
    const navEntry = navigationEntries[0];
    return navEntry.type === 'reload';
  }
  
  // Fallback for older browsers
  return performance.navigation && performance.navigation.type === performance.navigation.TYPE_RELOAD;
};

/**
 * Attempts to reconstruct navigation context from current URL and localStorage
 */
export const reconstructNavigationContext = () => {
  try {
    const currentPath = window.location.pathname;
    const saved = localStorage.getItem('kyc-navigation-stack');
    
    if (!saved) return null;
    
    const navigationStack = JSON.parse(saved);
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    
    // Filter out old entries and entries that lead to current page
    const validEntries = navigationStack.filter(entry => 
      entry.timestamp > thirtyMinutesAgo && entry.path !== currentPath
    );
    
    return validEntries;
  } catch (error) {
    console.warn('Failed to reconstruct navigation context:', error);
    return null;
  }
};

/**
 * Gets the likely previous page based on URL patterns
 */
export const inferPreviousPage = (currentPath) => {
  // Define common navigation patterns
  const patterns = [
    {
      pattern: /^\/view-customer-kyc\/[^/]+$/,
      previousPage: '/customer-kyc',
      description: 'KYC details to main dashboard'
    },
    {
      pattern: /^\/revise-customer-kyc\/[^/]+$/,
      previousPage: '/customer-kyc',
      description: 'KYC revision to main dashboard'
    },
    {
      pattern: /^\/view-completed-kyc\/[^/]+$/,
      previousPage: '/customer-kyc',
      description: 'Completed KYC details to main dashboard'
    },
    {
      pattern: /^\/view-draft-details\/[^/]+$/,
      previousPage: '/customer-kyc',
      description: 'Draft details to main dashboard'
    },
    {
      pattern: /^\/edit-completed-kyc\/[^/]+$/,
      previousPage: '/customer-kyc',
      description: 'Edit KYC to main dashboard'
    }
  ];
  
  for (const pattern of patterns) {
    if (pattern.pattern.test(currentPath)) {
      return {
        path: pattern.previousPage,
        description: pattern.description
      };
    }
  }
  
  // Default fallback
  return {
    path: '/customer-kyc',
    description: 'Main dashboard'
  };
};

/**
 * Smart back navigation that works even after page refresh
 */
export const smartGoBack = (navigate, fallbackRoute = '/customer-kyc') => {
  console.log('SmartGoBack called');
  
  // Try to use browser history first
  if (window.history.length > 1) {
    try {
      // Check if we came from within the same app
      const referrer = document.referrer;
      const currentOrigin = window.location.origin;
      
      if (referrer && referrer.startsWith(currentOrigin)) {
        console.log('Using browser history - came from same app');
        window.history.back();
        return true;
      }
    } catch (error) {
      console.warn('Browser history check failed:', error);
    }
  }
  
  // Fallback: try to reconstruct from localStorage
  const reconstructed = reconstructNavigationContext();
  if (reconstructed && reconstructed.length > 0) {
    const lastEntry = reconstructed[reconstructed.length - 1];
    console.log('Using reconstructed navigation to:', lastEntry.path);
    navigate(lastEntry.path);
    return true;
  }
  
  // Final fallback: use inferred previous page
  const inferred = inferPreviousPage(window.location.pathname);
  console.log('Using inferred navigation to:', inferred.path);
  navigate(inferred.path);
  return true;
};

/**
 * Enhanced smart back navigation with better error handling
 */
export const enhancedSmartGoBack = (navigate, fallbackRoute = '/customer-kyc') => {
  console.log('EnhancedSmartGoBack called');
  
  try {
    // First, check if we have a valid referrer from the same domain
    const referrer = document.referrer;
    const currentOrigin = window.location.origin;
    
    if (referrer && referrer.startsWith(currentOrigin)) {
      const referrerPath = new URL(referrer).pathname;
      console.log('Valid referrer found:', referrerPath);
      
      // Don't go back to the same page
      if (referrerPath !== window.location.pathname) {
        try {
          window.history.back();
          return true;
        } catch (historyError) {
          console.warn('History.back() failed, trying navigate:', historyError);
          navigate(referrerPath);
          return true;
        }
      }
    }
    
    // Try browser history
    if (window.history.length > 1) {
      try {
        console.log('Using browser history');
        window.history.back();
        return true;
      } catch (error) {
        console.warn('Browser history failed:', error);
      }
    }
    
    // Try to reconstruct from localStorage
    const reconstructed = reconstructNavigationContext();
    if (reconstructed && reconstructed.length > 0) {
      const lastEntry = reconstructed[reconstructed.length - 1];
      console.log('Using reconstructed navigation to:', lastEntry.path);
      navigate(lastEntry.path);
      return true;
    }
    
    // Use inferred previous page
    const inferred = inferPreviousPage(window.location.pathname);
    console.log('Using inferred navigation to:', inferred.path);
    navigate(inferred.path);
    return true;
    
  } catch (error) {
    console.error('All navigation methods failed:', error);
    // Final fallback
    try {
      navigate(fallbackRoute);
    } catch (finalError) {
      console.error('Even fallback navigation failed:', finalError);
      // Ultimate fallback - hard redirect
      window.location.href = fallbackRoute;
    }
    return false;
  }
};

/**
 * Validates that a navigation path is safe and accessible
 */
export const validateNavigationPath = (path) => {
  // Basic validation
  if (!path || typeof path !== 'string') {
    return false;
  }
  
  // Check if it's a valid route pattern
  const validPatterns = [
    /^\/customer-kyc$/,
    /^\/view-customer-kyc\/[^/]+$/,
    /^\/revise-customer-kyc\/[^/]+$/,
    /^\/view-completed-kyc\/[^/]+$/,
    /^\/view-draft-details\/[^/]+$/,
    /^\/edit-completed-kyc\/[^/]+$/
  ];
  
  return validPatterns.some(pattern => pattern.test(path));
};

/**
 * Session-based navigation tracking (clears on browser close)
 */
export const SessionNavigationTracker = {
  key: 'kyc-session-navigation',
  
  save: (navigationData) => {
    try {
      sessionStorage.setItem(this.key, JSON.stringify(navigationData));
    } catch (error) {
      console.warn('Failed to save session navigation:', error);
    }
  },
  
  load: () => {
    try {
      const data = sessionStorage.getItem(this.key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to load session navigation:', error);
      return null;
    }
  },
  
  clear: () => {
    try {
      sessionStorage.removeItem(this.key);
    } catch (error) {
      console.warn('Failed to clear session navigation:', error);
    }
  }
};

/**
 * Debug function to analyze current navigation state
 */
export const debugNavigationState = () => {
  const info = {
    isRefresh: isPageRefresh(),
    currentPath: window.location.pathname,
    browserHistoryLength: window.history.length,
    referrer: document.referrer,
    reconstructedContext: reconstructNavigationContext(),
    inferredPrevious: inferPreviousPage(window.location.pathname)
  };
  
  console.log('🔍 Navigation Debug Info:', info);
  return info;
};

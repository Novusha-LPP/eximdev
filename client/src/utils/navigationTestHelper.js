// Navigation Test Helper
// This file contains utility functions to test the navigation functionality

export const testNavigationScenarios = () => {
  console.log('🧪 Starting Navigation Tests...');
  
  // Test 1: Verify NavigationContext is available
  try {
    const navigation = window.navigationContext;
    if (navigation) {
      console.log('✅ NavigationContext is available');
    } else {
      console.log('❌ NavigationContext not found');
    }
  } catch (error) {
    console.log('❌ Error accessing NavigationContext:', error);
  }
  
  // Test 2: Check if navigation stack is being tracked
  const testNavigationStack = () => {
    console.log('📍 Current navigation stack length:', window.navigationStack?.length || 0);
  };
  
  // Test 3: Verify tab state persistence
  const testTabStatePersistence = () => {
    const savedTabState = localStorage.getItem('kyc-tab-state');
    console.log('📑 Saved tab state:', savedTabState);
  };
  
  return {
    testNavigationStack,
    testTabStatePersistence
  };
};

// Helper function to debug navigation state
export const debugNavigationState = (navigationContext) => {
  if (!navigationContext) {
    console.log('❌ No navigation context provided');
    return;
  }
  
  console.log('🔍 Navigation Debug Info:');
  console.log('  - Can go back:', navigationContext.canGoBack);
  console.log('  - Navigation stack length:', navigationContext.navigationStack.length);
  console.log('  - Previous location:', navigationContext.getPreviousLocation());
  
  if (navigationContext.navigationStack.length > 0) {
    console.log('  - Navigation history:');
    navigationContext.navigationStack.forEach((item, index) => {
      console.log(`    ${index + 1}. ${item.path} (tab: ${item.tabState})`);
    });
  }
};

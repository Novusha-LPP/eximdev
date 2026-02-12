// Utility functions for document handling

// Helper function to check if file URL exists and is valid
export const isValidFileUrl = (url) => {
  // Handle different data types
  if (!url) return false;
  
  // If it's an array, check if it has valid URLs
  if (Array.isArray(url)) {
    return url.length > 0 && url.some(item => typeof item === 'string' && item.trim() !== '');
  }
  
  // If it's not a string, return false
  if (typeof url !== 'string') {
    return false;
  }
  
  // For strings, check if it's not empty after trimming
  return url.trim() !== '';
};

// Helper function to open file in new tab
export const openFileInNewTab = (url) => {
  if (isValidFileUrl(url)) {
    // If it's an array, open the first valid URL
    if (Array.isArray(url)) {
      const firstValidUrl = url.find(item => typeof item === 'string' && item.trim() !== '');
      if (firstValidUrl) {
        window.open(firstValidUrl, '_blank', 'noopener,noreferrer');
      }
    } else if (typeof url === 'string') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
};

// Component for rendering a consistent View button
export const ViewButton = ({ url, label = "View" }) => {
  if (!isValidFileUrl(url)) {
    return null; // Don't render anything if no valid URL
  }

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openFileInNewTab(url);
  };

  return (
    <button 
      type="button"
      onClick={handleClick}
      style={{
        background: 'none',
        border: 'none',
        color: '#007bff',
        textDecoration: 'underline',
        cursor: 'pointer',
        padding: 0,
        marginRight: '8px'
      }}
    >
      {label}
    </button>
  );
};

// Component for rendering multiple View buttons for arrays
export const MultipleViewButtons = ({ urls, label = "View" }) => {
  if (!Array.isArray(urls) || urls.length === 0) {
    return null;
  }

  // Filter out invalid URLs
  const validUrls = urls.filter(url => url && typeof url === 'string' && url.trim() !== '');
  
  if (validUrls.length === 0) {
    return null;
  }

  const handleClick = (url) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    openFileInNewTab(url);
  };

  return (
    <div>
      {validUrls.map((url, index) => (
        <button
          key={index}
          type="button"
          onClick={handleClick(url)}
          style={{
            background: 'none',
            border: 'none',
            color: '#007bff',
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: 0,
            marginRight: '8px'
          }}
        >
          {validUrls.length > 1 ? `${label} ${index + 1}` : label}
        </button>
      ))}
    </div>
  );
};
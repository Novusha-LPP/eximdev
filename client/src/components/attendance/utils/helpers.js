import { format, parseISO, isValid, differenceInMinutes, differenceInHours, isToday as fnsIsToday } from 'date-fns';
import { DATE_FORMATS } from './constants';

/**
 * Format date with specified format
 */
export const formatDate = (date, formatStr = DATE_FORMATS.DISPLAY) => {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) ? format(dateObj, formatStr) : '';
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
};

/**
 * Check if the given date is today
 */
export const isToday = (date) => {
  if (!date) return false;
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d) ? fnsIsToday(d) : false;
  } catch (error) {
    console.error('Date checking error:', error);
    return false;
  }
};

/**
 * Calculate duration between two times
 */
export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return { hours: 0, minutes: 0, formatted: '0h 0m' };

  try {
    const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
    const end = typeof endTime === 'string' ? parseISO(endTime) : endTime;

    const totalMinutes = differenceInMinutes(end, start);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      hours,
      minutes,
      totalMinutes,
      formatted: `${hours}h ${minutes}m`
    };
  } catch (error) {
    console.error('Duration calculation error:', error);
    return { hours: 0, minutes: 0, formatted: '0h 0m' };
  }
};

/**
 * Convert minutes to hours format
 */
export const minutesToHours = (minutes) => {
  if (!minutes) return '0h 0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

/**
 * Format time from 24hr to 12hr
 */
// Inside src/utils/helpers.js


export const formatTime12Hr = (timeInput) => {
  if (!timeInput) return '';

  try {
    // Parse if string, otherwise use as is
    const dateObj = typeof timeInput === 'string' ? parseISO(timeInput) : timeInput;

    // Ensure the date is valid
    if (!isValid(dateObj)) return '';

    return format(dateObj, DATE_FORMATS.TIME_ONLY);
  } catch (error) {
    console.error('Time formatting error:', error);
    return timeInput;
  }
};

/**
 * Get initials from name
 */
export const getInitials = (name) => {
  if (!name) return '';

  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Capitalize first letter
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Format currency
 */
export const formatCurrency = (amount, currency = 'INR') => {
  if (amount === null || amount === undefined) return '';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Get status badge variant
 */
/**
 * Get status badge variant
 */
export const getStatusVariant = (status) => {
  if (!status) return 'default';

  // FIX: Convert input to Uppercase so it matches the keys
  const normalizedStatus = status.toUpperCase();

  const statusMap = {
    PRESENT: 'success',
    APPROVED: 'success',
    ABSENT: 'error',
    REJECTED: 'error',
    HALF_DAY: 'warning',
    LATE: 'warning',
    PENDING: 'warning',
    LEAVE: 'info',
    HOLIDAY: 'info',
    WEEKLY_OFF: 'info',
    CANCELLED: 'error'
  };

  return statusMap[normalizedStatus] || 'default';
};

/**
 * Truncate text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Debounce function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Download file
 */
export const downloadFile = (data, filename, type = 'text/csv') => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Get current location
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Group array by key
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

/**
 * Sort array by key
 */
export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
};

/**
 * Deep clone object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj) => {
  if (obj === null || obj === undefined) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format date time for display
export function formatDateTimeDisplay(dateString) {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  
  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium">
        {date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })}
      </span>
      <span className="text-xs text-muted-foreground">
        {date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}
      </span>
    </div>
  );
}

// Extract timestamp from UUID v1
export function extractTimestampFromUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') return null;
  
  // Clean the UUID string
  const cleanUuid = uuid.trim().toLowerCase();
  
  // UUID v1 regex pattern - matches the format in your API response
  const uuidV1Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  
  if (!uuidV1Regex.test(cleanUuid)) {
    console.warn('Not a valid UUID v1:', uuid);
    return null;
  }
  
  const parts = cleanUuid.split('-');
  
  try {
    // For UUID v1, the timestamp is spread across the first three parts
    // time_low (8 hex chars) - time_mid (4 hex chars) - time_high_and_version (4 hex chars)
    const timeLow = parts[0];              // 8 chars - low 32 bits of timestamp
    const timeMid = parts[1];              // 4 chars - middle 16 bits of timestamp  
    const timeHighAndVersion = parts[2];   // 4 chars - high 12 bits of timestamp + 4 bits version
    
    // Remove version bits (first digit after hyphen in parts[2] is version)
    // Version is in the high nibble of the first character
    const timeHigh = timeHighAndVersion.substring(1); // Skip the version digit, take last 3 chars
    
    // Reconstruct the 60-bit timestamp (in hex) in the correct order
    // UUID v1 stores timestamp as: time_high (12 bits) | time_mid (16 bits) | time_low (32 bits)
    const timestampHex = timeHighAndVersion.substring(1) + timeMid + timeLow;
    
    // Convert hex to decimal
    const timestamp = parseInt(timestampHex, 16);
    
    if (isNaN(timestamp) || timestamp === 0) {
      console.warn('Could not parse timestamp from UUID:', uuid);
      return null;
    }
    
    // UUID v1 timestamps are 100-nanosecond intervals since October 15, 1582 (Gregorian calendar)
    // Need to convert to milliseconds since Unix epoch (January 1, 1970)
    
    // Days between Oct 15, 1582 and Jan 1, 1970
    const GREGORIAN_EPOCH_OFFSET = 122192928000000000n; // in 100-nanosecond intervals
    
    // Use BigInt for precise calculations
    const timestampBig = BigInt(timestamp);
    const offsetBig = BigInt(GREGORIAN_EPOCH_OFFSET);
    
    // Subtract the offset and convert from 100-nanosecond intervals to milliseconds
    const unixTimestampMs = Number((timestampBig - offsetBig) / 10000n);
    
    const date = new Date(unixTimestampMs);
    
    // Sanity check: validate the year is reasonable (2000-2030)
    const year = date.getFullYear();
    if (year < 2000 || year > 2030) {
      console.warn('Extracted date year is out of range:', year, uuid);
      return null;
    }
    
    return date;
  } catch (error) {
    console.error('Failed to extract timestamp from UUID:', error, uuid);
    return null;
  }
}

// Check if string is a valid UUID v1
export function isUUIDv1(str) {
  if (!str || typeof str !== 'string') return false;
  const cleanStr = str.trim().toLowerCase();
  // UUID v1 format: 8-4-1xxx-[89ab]xxx-12
  const uuidV1Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  return uuidV1Regex.test(cleanStr);
}

// Check if a date string is valid
export function isValidDate(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.getFullYear() >= 1970;
}

// Additional utility functions that might be useful:

// Format phone number for display
export function formatPhoneNumber(phoneNumberString) {
  if (!phoneNumberString) return '';
  
  // Handle object format from phone input components
  if (typeof phoneNumberString === 'object') {
    const { countryCode, number } = phoneNumberString;
    return countryCode && number ? `${countryCode} ${number}` : '';
  }
  
  // Handle string format
  const cleaned = String(phoneNumberString).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
  }
  return phoneNumberString;
}

// Truncate text with ellipsis
export function truncateText(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Safe JSON parse with fallback
export function safeJsonParse(str, fallback = null) {
  if (str === null || str === undefined) return fallback;
  if (typeof str === 'object') return str;
  if (typeof str !== 'string') return str;
  
  const trimmed = str.trim();
  if (!trimmed) return fallback;
  
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return fallback;
    }
  }
  
  return str;
}

// Generate random ID
export function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Debounce function for search inputs
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Capitalize first letter
export function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Format file size
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
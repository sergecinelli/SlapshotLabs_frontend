/**
 * Utility functions for converting time between local timezone and GMT/UTC
 */

/**
 * Parse time string into hours, minutes, and seconds components
 * @param timeString Time string in format HH:mm:ss or HH:mm
 * @returns Object with hours, minutes, and seconds as numbers
 */
function parseTimeString(timeString: string): { hours: number; minutes: number; seconds: number } {
  const timeParts = timeString.split(':');
  return {
    hours: parseInt(timeParts[0] || '0', 10),
    minutes: parseInt(timeParts[1] || '0', 10),
    seconds: parseInt(timeParts[2] || '0', 10),
  };
}

/**
 * Format time components as HH:mm:ss string
 * @param hours Hours (0-23)
 * @param minutes Minutes (0-59)
 * @param seconds Seconds (0-59)
 * @returns Formatted time string in HH:mm:ss format
 */
function formatTimeString(hours: number, minutes: number, seconds: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Create UTC date-time string in ISO 8601 format
 * @param dateString Date string in format YYYY-MM-DD
 * @param hours Hours (0-23)
 * @param minutes Minutes (0-59)
 * @param seconds Seconds (0-59)
 * @returns UTC date-time string (e.g., "2025-12-18T23:30:00Z")
 */
function createUTCDateTimeString(dateString: string, hours: number, minutes: number, seconds: number): string {
  return `${dateString}T${formatTimeString(hours, minutes, seconds)}Z`;
}

/**
 * Parse date string or Date object, avoiding timezone issues
 * @param date Date string in format YYYY-MM-DD or Date object
 * @returns Date object
 */
function parseDateSafe(date: string | Date): Date {
  return typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
}

/**
 * Convert local date and time to GMT/UTC format for API
 * IMPORTANT: The date is preserved as the user selected it, only time is converted to GMT
 * @param dateString Date string in format YYYY-MM-DD (user's selected date)
 * @param timeString Time string in format HH:mm:ss (24-hour format, user's local time)
 * @returns Object with date (preserved) and time in GMT format
 */
export function convertLocalToGMT(dateString: string, timeString: string): { date: string; time: string } {
  if (!dateString || !timeString) {
    return { date: dateString, time: timeString };
  }

  // Parse time string (format: HH:mm:ss or HH:mm)
  const { hours, minutes, seconds } = parseTimeString(timeString);

  // Create a date object from local date and time
  // Parse the date string to get year, month, day
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create a date object using local time (this will be interpreted as local timezone)
  const localDate = new Date(year, month - 1, day, hours, minutes, seconds, 0);

  // Get the UTC equivalent time
  const gmtHours = localDate.getUTCHours();
  const gmtMinutes = localDate.getUTCMinutes();
  const gmtSeconds = localDate.getUTCSeconds();

  // IMPORTANT: Preserve the original date that the user selected
  // The date should remain as the user selected it, even if the time conversion
  // would normally shift it to a different day
  return {
    date: dateString, // Keep the original date
    time: formatTimeString(gmtHours, gmtMinutes, gmtSeconds),
  };
}

/**
 * Convert GMT/UTC date and time to local timezone for display
 * IMPORTANT: The date from backend is the original date the user selected, so we preserve it
 * Only the time is converted from GMT to local timezone
 * @param dateString Date string in format YYYY-MM-DD (original date from backend)
 * @param timeString Time string in format HH:mm:ss (GMT time from backend)
 * @returns Object with date (preserved) and time in local timezone
 */
export function convertGMTToLocal(dateString: string, timeString: string): { date: string; time: string } {
  if (!dateString || !timeString) {
    return { date: dateString, time: timeString };
  }

  // Parse GMT date and time
  const { hours, minutes, seconds } = parseTimeString(timeString);

  // Create UTC date-time string using the original date
  // The date from backend is the original date the user selected
  const utcDateString = createUTCDateTimeString(dateString, hours, minutes, seconds);
  
  // Create date object (will be interpreted as UTC)
  const utcDate = new Date(utcDateString);

  // Get local time components
  const localHours = utcDate.getHours();
  const localMinutes = utcDate.getMinutes();
  const localSeconds = utcDate.getSeconds();

  // IMPORTANT: Preserve the original date from backend
  // The date should remain as stored on backend (the date the user originally selected)
  // Even if the time conversion would normally shift it to a different day
  return {
    date: dateString, // Keep the original date from backend
    time: formatTimeString(localHours, localMinutes, localSeconds),
  };
}

/**
 * Convert GMT/UTC date and time to local timezone for display, accounting for date shifts
 * This function correctly handles cases where time conversion shifts the date to a different day
 * @param dateString Date string in format YYYY-MM-DD (UTC date from backend)
 * @param timeString Time string in format HH:mm:ss (UTC time from backend)
 * @returns Object with date and time in local timezone (date may differ from input if time shift crosses midnight)
 */
export function convertGMTToLocalWithDateShift(dateString: string, timeString: string): { date: string; time: string } {
  if (!dateString || !timeString) {
    return { date: dateString, time: timeString };
  }

  // Parse GMT date and time
  const { hours, minutes, seconds } = parseTimeString(timeString);

  // Create UTC date-time string
  const utcDateString = createUTCDateTimeString(dateString, hours, minutes, seconds);
  
  // Create date object (will be interpreted as UTC)
  const utcDate = new Date(utcDateString);

  // Get local date components (this accounts for date shifts)
  const localYear = utcDate.getFullYear();
  const localMonth = utcDate.getMonth() + 1; // getMonth() returns 0-11
  const localDay = utcDate.getDate();
  
  // Get local time components
  const localHours = utcDate.getHours();
  const localMinutes = utcDate.getMinutes();
  const localSeconds = utcDate.getSeconds();

  // Format date as YYYY-MM-DD (local)
  const localDateString = `${localYear}-${String(localMonth).padStart(2, '0')}-${String(localDay).padStart(2, '0')}`;

  return {
    date: localDateString,
    time: formatTimeString(localHours, localMinutes, localSeconds),
  };
}

/**
 * Format date for display (e.g., "Mon., Dec. 1")
 * @param dateString Date string in format YYYY-MM-DD
 * @returns Formatted date string
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return '';

  // If date is already formatted, return as is
  if (dateString.includes(',')) {
    return dateString;
  }

  try {
    const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };
    const formatted = date.toLocaleDateString('en-US', options);
    return formatted.replace(/(\w+), (\w+) (\d+)/, '$1., $2. $3');
  } catch {
    return dateString;
  }
}

/**
 * Format date string or Date object as "Nov 12, 2025"
 * @param date Date string in format YYYY-MM-DD or Date object
 * @returns Formatted date string (e.g., "Nov 12, 2025")
 */
export function formatDateShort(date: string | Date): string {
  if (!date) return '';

  const dateObj = parseDateSafe(date);
  
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date as "Nov, 7, 25" (short year format)
 * @param date Date string in format YYYY-MM-DD or Date object
 * @returns Formatted date string (e.g., "Nov, 7, 25")
 */
export function formatDateShortWithCommas(date: string | Date): string {
  if (!date) return '';

  const dateObj = parseDateSafe(date);
  const month = dateObj.toLocaleString('en-US', { month: 'short' });
  const day = dateObj.getDate();
  const year = dateObj.toLocaleString('en-US', { year: '2-digit' });
  
  return `${month}, ${day}, ${year}`;
}

/**
 * Format GMT/UTC date and time for display as "Nov 12, 2025, 7:30 PM" (local timezone)
 * Converts from GMT to local timezone and formats as date + time with AM/PM
 * @param dateString Date string in format YYYY-MM-DD (UTC date from backend)
 * @param timeString Time string in format HH:mm:ss (UTC time from backend)
 * @returns Formatted date and time string (e.g., "Nov 12, 2025, 7:30 PM")
 */
export function formatDateTimeFromGMT(dateString: string, timeString: string): string {
  if (!dateString || !timeString) return '';

  // Convert GMT to local timezone (accounting for date shifts)
  const { date: localDate, time: localTime } = convertGMTToLocalWithDateShift(dateString, timeString);
  
  // Parse local date and time
  const [year, month, day] = localDate.split('-').map(Number);
  const [hours, minutes] = localTime.split(':').map(Number);
  
  // Create Date object in local timezone
  const dateObj = new Date(year, month - 1, day, hours, minutes);
  
  // Format as "Nov 12, 2025, 7:30 PM"
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Utility functions for converting time between local timezone and GMT/UTC
 */

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
  const timeParts = timeString.split(':');
  const hours = parseInt(timeParts[0] || '0', 10);
  const minutes = parseInt(timeParts[1] || '0', 10);
  const seconds = parseInt(timeParts[2] || '0', 10);

  // Create a date object from local date and time
  // Parse the date string to get year, month, day
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create a date object using local time (this will be interpreted as local timezone)
  const localDate = new Date(year, month - 1, day, hours, minutes, seconds, 0);

  // Get the UTC equivalent time
  const gmtHours = localDate.getUTCHours();
  const gmtMinutes = localDate.getUTCMinutes();
  const gmtSeconds = localDate.getUTCSeconds();

  // Format time as HH:mm:ss in GMT
  const gmtTimeString = `${String(gmtHours).padStart(2, '0')}:${String(gmtMinutes).padStart(2, '0')}:${String(gmtSeconds).padStart(2, '0')}`;

  // IMPORTANT: Preserve the original date that the user selected
  // The date should remain as the user selected it, even if the time conversion
  // would normally shift it to a different day
  return {
    date: dateString, // Keep the original date
    time: gmtTimeString,
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
  const timeParts = timeString.split(':');
  const hours = parseInt(timeParts[0] || '0', 10);
  const minutes = parseInt(timeParts[1] || '0', 10);
  const seconds = parseInt(timeParts[2] || '0', 10);

  // Create UTC date-time string using the original date
  // The date from backend is the original date the user selected
  const utcDateString = `${dateString}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}Z`;
  
  // Create date object (will be interpreted as UTC)
  const utcDate = new Date(utcDateString);

  // Get local time components
  const localHours = utcDate.getHours();
  const localMinutes = utcDate.getMinutes();
  const localSeconds = utcDate.getSeconds();

  // Format time as HH:mm:ss (local)
  const localTimeString = `${String(localHours).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}:${String(localSeconds).padStart(2, '0')}`;

  // IMPORTANT: Preserve the original date from backend
  // The date should remain as stored on backend (the date the user originally selected)
  // Even if the time conversion would normally shift it to a different day
  return {
    date: dateString, // Keep the original date from backend
    time: localTimeString,
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
  const timeParts = timeString.split(':');
  const hours = parseInt(timeParts[0] || '0', 10);
  const minutes = parseInt(timeParts[1] || '0', 10);
  const seconds = parseInt(timeParts[2] || '0', 10);

  // Create UTC date-time string
  const utcDateString = `${dateString}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}Z`;
  
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
  
  // Format time as HH:mm:ss (local)
  const localTimeString = `${String(localHours).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}:${String(localSeconds).padStart(2, '0')}`;

  return {
    date: localDateString,
    time: localTimeString,
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

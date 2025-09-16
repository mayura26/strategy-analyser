/**
 * Utility functions for handling dates without timezone conversion
 * This ensures that dates stored in the database (like "2024-05-15") 
 * are displayed exactly as they are stored, without any timezone conversion.
 */

/**
 * Formats a date string (YYYY-MM-DD) for display without timezone conversion
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string for display
 */
export function formatDateOnly(dateString: string): string {
  if (!dateString) return '';
  
  // If it's already in YYYY-MM-DD format, format it nicely
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  }
  
  // If it's a full datetime string, extract just the date part
  const datePart = dateString.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split('-');
    return `${month}/${day}/${year}`;
  }
  
  return dateString;
}

/**
 * Formats a date range for display without timezone conversion
 * @param startDate - Start date string in YYYY-MM-DD format
 * @param endDate - End date string in YYYY-MM-DD format
 * @returns Formatted date range string
 */
export function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return 'Loading...';
  return `${formatDateOnly(startDate)} - ${formatDateOnly(endDate)}`;
}

/**
 * Sorts date strings without converting to Date objects
 * @param dates - Array of date strings in YYYY-MM-DD format
 * @returns Sorted array of date strings
 */
export function sortDateStrings(dates: string[]): string[] {
  return dates.sort((a, b) => {
    // Compare as strings since YYYY-MM-DD format sorts correctly lexicographically
    return a.localeCompare(b);
  });
}

/**
 * Gets the date range (start and end) from an array of date strings
 * @param dates - Array of date strings in YYYY-MM-DD format
 * @returns Object with start and end date strings, or null if no dates
 */
export function getDateRangeFromStrings(dates: string[]): { start: string; end: string } | null {
  if (!dates || dates.length === 0) return null;
  
  const sortedDates = sortDateStrings(dates);
  return {
    start: sortedDates[0],
    end: sortedDates[sortedDates.length - 1]
  };
}

/**
 * Checks if two date strings represent the same date
 * @param date1 - First date string
 * @param date2 - Second date string
 * @returns True if dates are the same
 */
export function isSameDate(date1: string, date2: string): boolean {
  return date1 === date2;
}

/**
 * Finds overlapping dates between multiple arrays of date strings
 * @param dateArrays - Array of date string arrays
 * @returns Array of dates that exist in all arrays
 */
export function findOverlappingDates(dateArrays: string[][]): string[] {
  if (dateArrays.length === 0) return [];
  if (dateArrays.length === 1) return dateArrays[0];
  
  // Start with the first array and filter by intersection with others
  let commonDates = dateArrays[0];
  
  for (let i = 1; i < dateArrays.length; i++) {
    const currentDates = new Set(dateArrays[i]);
    commonDates = commonDates.filter(date => currentDates.has(date));
  }
  
  return sortDateStrings(commonDates);
}

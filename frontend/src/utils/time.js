/**
 * Utility functions for attendance time and worked hours calculations.
 */

// Parse a 12-hour or 24-hour time string into minutes from midnight.
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const str = String(timeStr).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3] ? match[3].toUpperCase() : null;

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Calculate worked hours between clock-in and clock-out time strings.
 * Returns a number rounded to 1 decimal place (e.g., 8.5, 0.0).
 */
export function calculateWorkedHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0.0;
  const inMin = parseTimeToMinutes(clockIn);
  const outMin = parseTimeToMinutes(clockOut);

  if (inMin === null || outMin === null) return 0.0;

  let diff = outMin - inMin;
  if (diff < 0) {
    // Overnight shift: clockOut is next morning
    diff += 24 * 60;
  }

  return Math.round((diff / 60) * 10) / 10;
}

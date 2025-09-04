/**
 * Local time utilities - NO timezone/UTC conversions
 * All calculations treat times as naive local values
 */

export interface TimeComponents {
  h: number;
  m: number;
}

/**
 * Parse HH:mm string into hour/minute components
 */
export function parseHHmm(hhmm: string): TimeComponents {
  const [h, m] = hhmm.split(':').map(Number);
  return { h, m };
}

/**
 * Calculate minutes between two local times
 * If end < start, treat as overnight (add 24h)
 */
export function minutesBetweenLocal(startHHmm: string, endHHmm: string): number {
  const start = parseHHmm(startHHmm);
  const end = parseHHmm(endHHmm);
  
  let startMinutes = start.h * 60 + start.m;
  let endMinutes = end.h * 60 + end.m;
  
  // Handle overnight shifts
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours worth of minutes
  }
  
  return endMinutes - startMinutes;
}

/**
 * Convert minutes to fractional hours
 */
export function hoursFromMinutes(mins: number): number {
  return mins / 60;
}

/**
 * Get the Sunday start of the week for a given date
 */
export function weekStartSunday(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = date.getDay(); // 0 = Sunday
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - dayOfWeek);
  return sunday.toISOString().split('T')[0];
}

/**
 * Add days to a date string
 */
export function addDays(dateStr: string, n: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + n);
  return date.toISOString().split('T')[0];
}

/**
 * Check if date is in range (inclusive)
 */
export function inRange(dateStr: string, startStr: string, endStr: string): boolean {
  return dateStr >= startStr && dateStr <= endStr;
}

/**
 * Get today as YYYY-MM-DD string
 */
export function getTodayLocal(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current time as HH:mm string
 */
export function getNowTimeLocal(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}
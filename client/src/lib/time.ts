import { DateTime } from 'luxon';

/**
 * Converts a local date and time to UTC
 * @param dateISO - Local date in YYYY-MM-DD format
 * @param timeHHmm - Local time in HH:mm format
 * @param zone - Timezone identifier (e.g., 'America/Chicago')
 * @returns UTC Date object
 */
export function toUtcFromLocal(dateISO: string, timeHHmm: string, zone: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  const [hour, minute] = timeHHmm.split(':').map(Number);
  
  const localDateTime = DateTime.fromObject(
    { year, month, day, hour, minute },
    { zone }
  );
  
  return localDateTime.toJSDate();
}

/**
 * Converts a UTC timestamp to local display format
 * @param timestamptzUTC - UTC timestamp (Date object or ISO string)
 * @param userZone - User's timezone identifier
 * @returns Object with local date and formatted time
 */
export function toLocalDisplay(
  timestamptzUTC: Date | string, 
  userZone: string
): { date: string; time: string } {
  const utcDateTime = typeof timestamptzUTC === 'string' 
    ? DateTime.fromISO(timestamptzUTC, { zone: 'utc' })
    : DateTime.fromJSDate(timestamptzUTC, { zone: 'utc' });
  
  const localDateTime = utcDateTime.setZone(userZone);
  
  return {
    date: localDateTime.toFormat('yyyy-MM-dd'),
    time: localDateTime.toFormat('h:mm a')
  };
}

/**
 * Checks if a time range represents an overnight shift
 * @param startHHmm - Start time in HH:mm format
 * @param endHHmm - End time in HH:mm format
 * @returns True if the shift spans midnight (end time is before start time)
 */
export function isOvernight(startHHmm: string, endHHmm: string): boolean {
  const [startHour, startMinute] = startHHmm.split(':').map(Number);
  const [endHour, endMinute] = endHHmm.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  return endMinutes < startMinutes;
}
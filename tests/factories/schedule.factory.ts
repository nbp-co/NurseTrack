export interface ScheduleFactoryOptions {
  defaultStart?: string;
  defaultEnd?: string;
  enabledDays?: number[];
  customTimes?: Record<number, { start: string; end: string }>;
}

export function createScheduleFactory(options: ScheduleFactoryOptions = {}) {
  const {
    defaultStart = '07:00',
    defaultEnd = '19:00',
    enabledDays = [1, 2, 3, 4, 5], // Monday-Friday by default
    customTimes = {}
  } = options;

  const schedule = {
    defaultStart,
    defaultEnd,
    days: {} as Record<string, { enabled: boolean; start?: string; end?: string }>
  };

  // Set up all days of the week (0 = Sunday, 6 = Saturday)
  for (let dayIndex = 0; dayIndex <= 6; dayIndex++) {
    const isEnabled = enabledDays.includes(dayIndex);
    const customTime = customTimes[dayIndex];
    
    schedule.days[dayIndex.toString()] = {
      enabled: isEnabled,
      start: customTime?.start || (isEnabled ? defaultStart : undefined),
      end: customTime?.end || (isEnabled ? defaultEnd : undefined),
    };
  }

  return schedule;
}

export function createFullWeekScheduleFactory() {
  return createScheduleFactory({
    enabledDays: [0, 1, 2, 3, 4, 5, 6] // All days
  });
}

export function createWeekdaysOnlyScheduleFactory() {
  return createScheduleFactory({
    enabledDays: [1, 2, 3, 4, 5] // Monday-Friday
  });
}

export function createWeekendsOnlyScheduleFactory() {
  return createScheduleFactory({
    enabledDays: [0, 6], // Sunday and Saturday
    defaultStart: '10:00',
    defaultEnd: '22:00'
  });
}

export function createNightShiftScheduleFactory() {
  return createScheduleFactory({
    enabledDays: [1, 2, 3, 4, 5],
    defaultStart: '19:00',
    defaultEnd: '07:00'
  });
}

export function createSplitShiftScheduleFactory() {
  return createScheduleFactory({
    enabledDays: [1, 2, 3, 4, 5],
    customTimes: {
      1: { start: '06:00', end: '14:00' }, // Monday early
      2: { start: '07:00', end: '15:00' }, // Tuesday regular
      3: { start: '08:00', end: '16:00' }, // Wednesday late start
      4: { start: '07:00', end: '15:00' }, // Thursday regular  
      5: { start: '06:00', end: '14:00' }, // Friday early
    }
  });
}

export function createCustomScheduleFactory(days: { dayIndex: number; start: string; end: string }[]) {
  const enabledDays = days.map(d => d.dayIndex);
  const customTimes = days.reduce((acc, day) => {
    acc[day.dayIndex] = { start: day.start, end: day.end };
    return acc;
  }, {} as Record<number, { start: string; end: string }>);

  return createScheduleFactory({
    enabledDays,
    customTimes
  });
}
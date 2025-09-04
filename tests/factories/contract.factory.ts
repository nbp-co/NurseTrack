import { DateTime } from 'luxon';
import type { CreateContractRequest } from '@shared/schema';

export interface ContractFactoryOptions {
  name?: string;
  facility?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  baseRate?: string;
  otRate?: string;
  hoursPerWeek?: string;
  timezone?: string;
  schedule?: {
    defaultStart?: string;
    defaultEnd?: string;
    days?: Record<string, { enabled: boolean; start?: string; end?: string }>;
  };
  seedShifts?: boolean;
}

export function createContractFactory(options: ContractFactoryOptions = {}): CreateContractRequest {
  const now = DateTime.now();
  const startDate = options.startDate || now.toISODate()!;
  const endDate = options.endDate || now.plus({ days: 30 }).toISODate()!;

  return {
    name: options.name || 'Test Contract',
    facility: options.facility || 'Test Hospital',
    role: options.role || 'Registered Nurse (RN)',
    startDate,
    endDate,
    baseRate: options.baseRate || '45.00',
    otRate: options.otRate || '67.50',
    hoursPerWeek: options.hoursPerWeek || '36',
    timezone: options.timezone || 'America/Chicago',
    schedule: options.schedule || {
      defaultStart: '07:00',
      defaultEnd: '19:00',
      days: {
        '1': { enabled: true, start: '07:00', end: '19:00' }, // Monday
        '2': { enabled: true, start: '07:00', end: '19:00' }, // Tuesday
        '3': { enabled: true, start: '07:00', end: '19:00' }, // Wednesday
        '4': { enabled: true, start: '07:00', end: '19:00' }, // Thursday
        '5': { enabled: true, start: '07:00', end: '19:00' }, // Friday
      }
    },
    seedShifts: options.seedShifts ?? true,
  };
}

export function createMinimalContractFactory(): CreateContractRequest {
  return createContractFactory({
    name: 'Minimal Contract',
    schedule: {
      defaultStart: '08:00',
      defaultEnd: '16:00',
      days: {
        '1': { enabled: true, start: '08:00', end: '16:00' }, // Monday only
      }
    }
  });
}

export function createWeekendContractFactory(): CreateContractRequest {
  return createContractFactory({
    name: 'Weekend Contract',
    schedule: {
      defaultStart: '12:00',
      defaultEnd: '00:00',
      days: {
        '0': { enabled: true, start: '12:00', end: '00:00' }, // Sunday
        '6': { enabled: true, start: '12:00', end: '00:00' }, // Saturday
      }
    }
  });
}

export function createNightShiftContractFactory(): CreateContractRequest {
  return createContractFactory({
    name: 'Night Shift Contract',
    schedule: {
      defaultStart: '19:00',
      defaultEnd: '07:00',
      days: {
        '1': { enabled: true, start: '19:00', end: '07:00' },
        '2': { enabled: true, start: '19:00', end: '07:00' },
        '3': { enabled: true, start: '19:00', end: '07:00' },
        '4': { enabled: true, start: '19:00', end: '07:00' },
        '5': { enabled: true, start: '19:00', end: '07:00' },
      }
    }
  });
}
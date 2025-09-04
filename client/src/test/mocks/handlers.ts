import { http, HttpResponse } from 'msw';
import type { Shift, Contract } from '@shared/schema';

// Mock data
const mockShifts: Shift[] = [
  {
    id: 1,
    userId: 1,
    localDate: '2024-09-15',
    startUtc: '2024-09-15T12:00:00.000Z',
    endUtc: '2024-09-15T20:00:00.000Z',
    facility: 'General Hospital',
    contractId: 1,
    status: 'active',
    source: 'contract',
    timezone: 'America/Chicago',
    notes: null,
    createdAt: '2024-09-01T10:00:00.000Z',
    updatedAt: '2024-09-01T10:00:00.000Z'
  },
  {
    id: 2,
    userId: 1,
    localDate: '2024-09-16',
    startUtc: '2024-09-16T13:00:00.000Z',
    endUtc: '2024-09-16T21:00:00.000Z',
    facility: 'City Clinic',
    contractId: null,
    status: 'active',
    source: 'manual',
    timezone: 'America/Chicago',
    notes: 'Manual shift entry',
    createdAt: '2024-09-01T11:00:00.000Z',
    updatedAt: '2024-09-01T11:00:00.000Z'
  }
];

const mockContracts: Contract[] = [
  {
    id: 1,
    userId: 1,
    name: 'General Hospital Contract',
    facility: 'General Hospital',
    contactName: 'Jane Smith',
    contactPhone: '555-0123',
    contactEmail: 'jane@generalhospital.com',
    address: '123 Medical Center Dr',
    notes: 'Primary contract',
    baseRate: '45.00',
    bonusRate: null,
    startDate: '2024-09-01',
    endDate: '2024-12-31',
    timezone: 'America/Chicago',
    status: 'active',
    schedule: {
      sunday: { enabled: false, start: '07:00', end: '19:00' },
      monday: { enabled: true, start: '07:00', end: '19:00' },
      tuesday: { enabled: true, start: '07:00', end: '19:00' },
      wednesday: { enabled: true, start: '07:00', end: '19:00' },
      thursday: { enabled: true, start: '07:00', end: '19:00' },
      friday: { enabled: true, start: '07:00', end: '19:00' },
      saturday: { enabled: false, start: '07:00', end: '19:00' }
    },
    source: 'manual',
    createdAt: '2024-09-01T10:00:00.000Z',
    updatedAt: '2024-09-01T10:00:00.000Z'
  }
];

export const handlers = [
  // Get shifts
  http.get('/api/shifts', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    
    let filteredShifts = mockShifts.filter(shift => 
      shift.userId === Number(userId)
    );
    
    if (from && to) {
      filteredShifts = filteredShifts.filter(shift => 
        shift.localDate >= from && shift.localDate <= to
      );
    }
    
    return HttpResponse.json(filteredShifts);
  }),

  // Create shift
  http.post('/api/shifts', async ({ request }) => {
    const newShift = await request.json() as Partial<Shift>;
    const shift: Shift = {
      id: Date.now(),
      userId: 1,
      localDate: newShift.localDate || '2024-09-15',
      startUtc: newShift.startUtc || '2024-09-15T12:00:00.000Z',
      endUtc: newShift.endUtc || '2024-09-15T20:00:00.000Z',
      facility: newShift.facility || '',
      contractId: newShift.contractId || null,
      status: 'active',
      source: newShift.contractId ? 'contract' : 'manual',
      timezone: newShift.timezone || 'America/Chicago',
      notes: newShift.notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockShifts.push(shift);
    return HttpResponse.json(shift, { status: 201 });
  }),

  // Update shift
  http.put('/api/shifts/:id', async ({ params, request }) => {
    const id = Number(params.id);
    const updates = await request.json() as Partial<Shift>;
    
    const shiftIndex = mockShifts.findIndex(shift => shift.id === id);
    if (shiftIndex === -1) {
      return HttpResponse.json({ error: 'Shift not found' }, { status: 404 });
    }
    
    mockShifts[shiftIndex] = {
      ...mockShifts[shiftIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    return HttpResponse.json(mockShifts[shiftIndex]);
  }),

  // Delete shift
  http.delete('/api/shifts/:id', ({ params }) => {
    const id = Number(params.id);
    const shiftIndex = mockShifts.findIndex(shift => shift.id === id);
    
    if (shiftIndex === -1) {
      return HttpResponse.json({ error: 'Shift not found' }, { status: 404 });
    }
    
    mockShifts.splice(shiftIndex, 1);
    return HttpResponse.json({ success: true });
  }),

  // Get contracts
  http.get('/api/contracts', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status');
    
    let filteredContracts = mockContracts.filter(contract => 
      contract.userId === Number(userId)
    );
    
    if (status) {
      filteredContracts = filteredContracts.filter(contract => 
        contract.status === status
      );
    }
    
    return HttpResponse.json(filteredContracts);
  }),

  // Get contract schedule preview
  http.get('/api/contracts/:id/schedule-preview', ({ params, request }) => {
    const id = Number(params.id);
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    
    const contract = mockContracts.find(c => c.id === id);
    if (!contract) {
      return HttpResponse.json({ error: 'Contract not found' }, { status: 404 });
    }
    
    if (!date) {
      return HttpResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }
    
    // Get day of week from date
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'lowercase' });
    const dayKey = dayOfWeek as keyof typeof contract.schedule;
    const daySchedule = contract.schedule[dayKey];
    
    return HttpResponse.json({
      enabled: daySchedule.enabled,
      start: daySchedule.start,
      end: daySchedule.end,
      timezone: contract.timezone
    });
  }),

  // Auth endpoints for testing
  http.get('/api/user', () => {
    return HttpResponse.json({
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    });
  }),

  http.post('/api/login', () => {
    return HttpResponse.json({
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    });
  })
];
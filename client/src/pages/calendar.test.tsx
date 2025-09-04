import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@/test/utils';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import CalendarPage from './calendar';

// Mock the useAuth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'testuser', email: 'test@example.com' },
    login: jest.fn(),
    logout: jest.fn(),
    isLoading: false,
  }),
}));

// Mock wouter's useLocation
jest.mock('wouter', () => ({
  useLocation: () => ['/calendar', jest.fn()],
}));

describe('Calendar Page Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Calendar shows seeded contract shifts', () => {
    it('displays seeded shifts from contracts on calendar', async () => {
      // Mock shifts with contract source
      server.use(
        http.get('/api/shifts', () => {
          return HttpResponse.json([
            {
              id: 1,
              userId: 1,
              localDate: '2024-09-15',
              startUtc: '2024-09-15T12:00:00.000Z',
              endUtc: '2024-09-15T20:00:00.000Z',
              facility: 'General Hospital',
              contractId: 1,
              status: 'active',
              source: 'contract_seed',
              timezone: 'America/Chicago',
              notes: null,
              createdAt: '2024-09-01T10:00:00.000Z',
              updatedAt: '2024-09-01T10:00:00.000Z'
            }
          ]);
        })
      );

      render(<CalendarPage />);

      // Wait for calendar to load
      await waitFor(() => {
        expect(screen.getByText('September 2024')).toBeInTheDocument();
      });

      // Check that seeded shift appears on calendar
      await waitFor(() => {
        const shiftElement = screen.getByTestId('shift-1');
        expect(shiftElement).toBeInTheDocument();
        expect(shiftElement).toHaveTextContent('General Hospital');
      });
    });
  });

  describe('Add Shift Modal Functionality', () => {
    it('auto-fills times when selecting contract', async () => {
      render(<CalendarPage />);

      // Wait for calendar to load
      await waitFor(() => {
        expect(screen.getByText('September 2024')).toBeInTheDocument();
      });

      // Click on a date to open Add Shift modal
      const dayCell = screen.getByTestId('day-cell-2024-09-15');
      fireEvent.click(dayCell);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByTestId('add-edit-shift-modal')).toBeInTheDocument();
      });

      // Select a contract from dropdown
      const contractSelect = screen.getByTestId('select-contract');
      fireEvent.click(contractSelect);
      
      await waitFor(() => {
        const contractOption = screen.getByText('General Hospital Contract (General Hospital)');
        fireEvent.click(contractOption);
      });

      // Wait for schedule preview to auto-fill times
      await waitFor(() => {
        const startInput = screen.getByDisplayValue('07:00');
        const endInput = screen.getByDisplayValue('19:00');
        expect(startInput).toBeInTheDocument();
        expect(endInput).toBeInTheDocument();
      });
    });

    it('clears preview when switching to "No contract"', async () => {
      render(<CalendarPage />);

      // Wait for calendar to load
      await waitFor(() => {
        expect(screen.getByText('September 2024')).toBeInTheDocument();
      });

      // Click on a date to open Add Shift modal
      const dayCell = screen.getByTestId('day-cell-2024-09-15');
      fireEvent.click(dayCell);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByTestId('add-edit-shift-modal')).toBeInTheDocument();
      });

      // First select a contract
      const contractSelect = screen.getByTestId('select-contract');
      fireEvent.click(contractSelect);
      
      await waitFor(() => {
        const contractOption = screen.getByText('General Hospital Contract (General Hospital)');
        fireEvent.click(contractOption);
      });

      // Wait for times to be auto-filled
      await waitFor(() => {
        expect(screen.getByDisplayValue('07:00')).toBeInTheDocument();
      });

      // Now switch to "No contract"
      fireEvent.click(contractSelect);
      await waitFor(() => {
        const noContractOption = screen.getByText('No contract');
        fireEvent.click(noContractOption);
      });

      // Times should reset to defaults
      await waitFor(() => {
        expect(screen.getByDisplayValue('07:00')).toBeInTheDocument();
        expect(screen.getByDisplayValue('19:00')).toBeInTheDocument();
      });
    });

    it('disables Create button for out-of-range dates', async () => {
      // Mock schedule preview to return out-of-range error
      server.use(
        http.get('/api/contracts/1/schedule-preview', () => {
          return HttpResponse.json(
            { message: 'Date is outside contract range' }, 
            { status: 409 }
          );
        })
      );

      render(<CalendarPage />);

      // Wait for calendar to load
      await waitFor(() => {
        expect(screen.getByText('September 2024')).toBeInTheDocument();
      });

      // Click on a date to open Add Shift modal
      const dayCell = screen.getByTestId('day-cell-2024-09-15');
      fireEvent.click(dayCell);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByTestId('add-edit-shift-modal')).toBeInTheDocument();
      });

      // Select a contract
      const contractSelect = screen.getByTestId('select-contract');
      fireEvent.click(contractSelect);
      
      await waitFor(() => {
        const contractOption = screen.getByText('General Hospital Contract (General Hospital)');
        fireEvent.click(contractOption);
      });

      // Should show out-of-range warning and disable Create button
      await waitFor(() => {
        expect(screen.getByText(/Date is outside contract range/)).toBeInTheDocument();
        const createButton = screen.getByTestId('button-create-shift');
        expect(createButton).toBeDisabled();
      });
    });

    it('shows overnight shift "(+1 day)" badge', async () => {
      // Mock shifts with overnight shift
      server.use(
        http.get('/api/shifts', () => {
          return HttpResponse.json([
            {
              id: 1,
              userId: 1,
              localDate: '2024-09-15',
              startUtc: '2024-09-16T02:00:00.000Z', // 9 PM Chicago time
              endUtc: '2024-09-16T12:00:00.000Z',   // 7 AM next day Chicago time
              facility: 'Night Clinic',
              contractId: null,
              status: 'active',
              source: 'manual',
              timezone: 'America/Chicago',
              notes: 'Overnight shift',
              createdAt: '2024-09-01T10:00:00.000Z',
              updatedAt: '2024-09-01T10:00:00.000Z'
            }
          ]);
        })
      );

      render(<CalendarPage />);

      // Wait for calendar to load
      await waitFor(() => {
        expect(screen.getByText('September 2024')).toBeInTheDocument();
      });

      // Check for overnight badge
      await waitFor(() => {
        const overnightBadge = screen.getByText('(+1 day)');
        expect(overnightBadge).toBeInTheDocument();
      });
    });

    it('shows overlap warning for conflicting shifts', async () => {
      // Mock existing shift on the same day
      server.use(
        http.get('/api/shifts', ({ request }) => {
          const url = new URL(request.url);
          if (url.searchParams.get('date')) {
            // Return existing shift for overlap check
            return HttpResponse.json([
              {
                id: 2,
                userId: 1,
                localDate: '2024-09-15',
                startUtc: '2024-09-15T14:00:00.000Z',
                endUtc: '2024-09-15T22:00:00.000Z',
                facility: 'Existing Shift',
                contractId: null,
                status: 'active',
                source: 'manual',
                timezone: 'America/Chicago',
                notes: null,
                createdAt: '2024-09-01T10:00:00.000Z',
                updatedAt: '2024-09-01T10:00:00.000Z'
              }
            ]);
          }
          return HttpResponse.json([]);
        })
      );

      render(<CalendarPage />);

      // Wait for calendar to load
      await waitFor(() => {
        expect(screen.getByText('September 2024')).toBeInTheDocument();
      });

      // Click on a date to open Add Shift modal
      const dayCell = screen.getByTestId('day-cell-2024-09-15');
      fireEvent.click(dayCell);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByTestId('add-edit-shift-modal')).toBeInTheDocument();
      });

      // Set overlapping times
      const startInput = screen.getByLabelText(/start time/i);
      const endInput = screen.getByLabelText(/end time/i);
      
      await act(async () => {
        fireEvent.change(startInput, { target: { value: '10:00' } });
        fireEvent.change(endInput, { target: { value: '18:00' } });
      });

      // Should show overlap warning
      await waitFor(() => {
        expect(screen.getByText(/Time overlaps with existing shift/)).toBeInTheDocument();
        expect(screen.getByText(/Existing Shift/)).toBeInTheDocument();
      });

      // Create button should still be enabled (non-blocking warning)
      const createButton = screen.getByTestId('button-create-shift');
      expect(createButton).not.toBeDisabled();
    });
  });
});
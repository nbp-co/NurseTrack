import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { CalendarMonthView } from './CalendarMonthView';

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

describe('CalendarMonthView', () => {
  const defaultProps = {
    currentDate: new Date('2024-09-15'),
    shifts: [
      {
        id: 1,
        userId: 1,
        localDate: '2024-09-15',
        startUtc: '2024-09-15T12:00:00.000Z',
        endUtc: '2024-09-15T20:00:00.000Z',
        facility: 'General Hospital',
        contractId: 1,
        status: 'active' as const,
        source: 'contract' as const,
        timezone: 'America/Chicago',
        notes: null,
        createdAt: '2024-09-01T10:00:00.000Z',
        updatedAt: '2024-09-01T10:00:00.000Z'
      }
    ],
    onDateClick: jest.fn(),
    onShiftClick: jest.fn(),
    onPrevMonth: jest.fn(),
    onNextMonth: jest.fn(),
    selectedDate: '2024-09-15',
    isLoading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders calendar grid with correct month', () => {
    render(<CalendarMonthView {...defaultProps} />);
    
    expect(screen.getByText('September 2024')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('displays shifts on correct dates', () => {
    render(<CalendarMonthView {...defaultProps} />);
    
    // Find the cell for September 15th and check for shift indicator
    const dayCell = screen.getByTestId('day-cell-2024-09-15');
    expect(dayCell).toBeInTheDocument();
    
    // Check for shift content
    expect(dayCell).toHaveTextContent('15');
  });

  it('calls onDateClick when clicking on a date', () => {
    render(<CalendarMonthView {...defaultProps} />);
    
    const dayCell = screen.getByTestId('day-cell-2024-09-15');
    fireEvent.click(dayCell);
    
    expect(defaultProps.onDateClick).toHaveBeenCalledWith('2024-09-15');
  });

  it('calls onShiftClick when clicking on a shift', async () => {
    render(<CalendarMonthView {...defaultProps} />);
    
    // Find shift element by test id
    const shiftElement = screen.getByTestId('shift-1');
    fireEvent.click(shiftElement);
    
    await waitFor(() => {
      expect(defaultProps.onShiftClick).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        localDate: '2024-09-15'
      }));
    });
  });

  it('navigates to previous month', () => {
    render(<CalendarMonthView {...defaultProps} />);
    
    const prevButton = screen.getByTestId('button-prev-month');
    fireEvent.click(prevButton);
    
    expect(defaultProps.onPrevMonth).toHaveBeenCalled();
  });

  it('navigates to next month', () => {
    render(<CalendarMonthView {...defaultProps} />);
    
    const nextButton = screen.getByTestId('button-next-month');
    fireEvent.click(nextButton);
    
    expect(defaultProps.onNextMonth).toHaveBeenCalled();
  });

  it('highlights selected date', () => {
    render(<CalendarMonthView {...defaultProps} />);
    
    const selectedCell = screen.getByTestId('day-cell-2024-09-15');
    expect(selectedCell).toHaveClass('bg-blue-100');
  });

  it('shows loading state', () => {
    render(<CalendarMonthView {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
  });

  it('handles empty shifts array', () => {
    render(<CalendarMonthView {...defaultProps} shifts={[]} />);
    
    // Should still render the calendar grid
    expect(screen.getByText('September 2024')).toBeInTheDocument();
    
    // But no shift indicators
    const dayCell = screen.getByTestId('day-cell-2024-09-15');
    expect(dayCell).not.toHaveTextContent('General Hospital');
  });

  it('displays multiple shifts on same date', () => {
    const multipleShifts = [
      ...defaultProps.shifts,
      {
        id: 2,
        userId: 1,
        localDate: '2024-09-15',
        startUtc: '2024-09-15T21:00:00.000Z',
        endUtc: '2024-09-16T05:00:00.000Z',
        facility: 'City Clinic',
        contractId: null,
        status: 'active' as const,
        source: 'manual' as const,
        timezone: 'America/Chicago',
        notes: null,
        createdAt: '2024-09-01T11:00:00.000Z',
        updatedAt: '2024-09-01T11:00:00.000Z'
      }
    ];

    render(<CalendarMonthView {...defaultProps} shifts={multipleShifts} />);
    
    const dayCell = screen.getByTestId('day-cell-2024-09-15');
    
    // Should show both shifts
    expect(screen.getByTestId('shift-1')).toBeInTheDocument();
    expect(screen.getByTestId('shift-2')).toBeInTheDocument();
  });
});
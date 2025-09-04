# NurseTrack Testing Infrastructure

## Overview

The NurseTrack project now includes a comprehensive testing infrastructure with separate configurations for backend and frontend testing, MSW (Mock Service Worker) integration, and enforced coverage thresholds.

## Test Structure

### Jest Configuration
- **Projects-based setup**: Separate configurations for backend and frontend testing
- **Backend tests**: Use Node.js environment with ESM support
- **Frontend tests**: Use jsdom environment with React Testing Library

### Coverage Requirements
- **Global frontend coverage**: 60% minimum across all metrics
- **Calendar components**: 75% minimum (lines, functions, statements), 70% branches
- **Time utilities (time.ts)**: 90% minimum (lines, functions, statements), 85% branches
- **Backend services**: 80% minimum for contracts service and routes

## File Structure

```
├── jest.config.js                          # Main Jest configuration with projects
├── tests/                                   # Backend tests
│   ├── setup.ts                           # Backend test setup
│   ├── contracts.test.ts                  # Contract service unit tests
│   └── contracts.integration.test.ts     # Contract API integration tests
├── client/src/
│   ├── test/
│   │   ├── setup.ts                       # Frontend test setup with MSW
│   │   ├── utils.tsx                      # React Testing Library utilities
│   │   └── mocks/
│   │       ├── server.ts                  # MSW server configuration
│   │       └── handlers.ts                # API mock handlers
│   ├── lib/
│   │   └── time.test.ts                   # Time utilities comprehensive tests
│   └── components/calendar/
│       └── CalendarMonthView.test.tsx     # Calendar component tests
└── server/tests/
    └── calendar.test.ts                   # Calendar service tests
```

## Mock Service Worker (MSW)

### Purpose
MSW intercepts network requests during testing, allowing frontend tests to run independently without requiring a real backend server.

### API Endpoints Mocked
- `GET /api/shifts` - Retrieve shifts with filtering
- `POST /api/shifts` - Create new shifts
- `PUT /api/shifts/:id` - Update existing shifts
- `DELETE /api/shifts/:id` - Delete shifts
- `GET /api/contracts` - Retrieve contracts
- `GET /api/contracts/:id/schedule-preview` - Get contract schedule preview
- `GET /api/user` - User authentication data
- `POST /api/login` - User login

### Mock Data
The handlers include realistic mock data for:
- Shifts with timezone-aware UTC timestamps
- Contracts with weekly schedules
- User authentication responses

## Running Tests

### Available Commands
```bash
# Run all tests (both backend and frontend)
npx jest

# Run only backend tests
npx jest --selectProjects=backend

# Run only frontend tests  
npx jest --selectProjects=frontend

# Run with coverage report
npx jest --coverage

# Run specific test file
npx jest client/src/lib/time.test.ts --selectProjects=frontend

# Run tests in watch mode
npx jest --watch
```

### Coverage Thresholds
The Jest configuration enforces minimum coverage thresholds:

- **Calendar components** must achieve ≥75% coverage
- **Time utilities** must achieve ≥90% coverage  
- **Backend contracts service** must achieve ≥80% coverage

Tests will fail if coverage falls below these thresholds.

## Test Examples

### Time Utilities Testing
The `time.test.ts` file demonstrates comprehensive testing of timezone-aware functions:

```typescript
// DST transition testing
it('handles DST transition - spring forward', () => {
  const result = toUtcFromLocal('2024-03-10', '14:30', 'America/Chicago');
  expect(result).toBe('2024-03-10T19:30:00.000Z');
});

// Round-trip conversion testing
it('round trip conversion preserves local time', () => {
  const originalDate = '2024-06-15';
  const originalTime = '14:30';
  const timezone = 'America/Chicago';
  
  const utc = toUtcFromLocal(originalDate, originalTime, timezone);
  const displayTime = toLocalDisplay(utc, timezone);
  
  expect(displayTime).toBe('2:30 PM');
});
```

### Calendar Component Testing
The `CalendarMonthView.test.tsx` demonstrates React component testing with MSW:

```typescript
// Component rendering with mocked data
it('displays shifts on correct dates', () => {
  render(<CalendarMonthView {...defaultProps} />);
  
  const dayCell = screen.getByTestId('day-cell-2024-09-15');
  expect(dayCell).toBeInTheDocument();
  expect(dayCell).toHaveTextContent('15');
});

// User interaction testing
it('calls onDateClick when clicking on a date', () => {
  render(<CalendarMonthView {...defaultProps} />);
  
  const dayCell = screen.getByTestId('day-cell-2024-09-15');
  fireEvent.click(dayCell);
  
  expect(defaultProps.onDateClick).toHaveBeenCalledWith('2024-09-15');
});
```

## Best Practices

### Frontend Testing
1. **Use the custom render function** from `test/utils.tsx` that includes QueryClient provider
2. **Mock external hooks** like `useAuth` and `useLocation` for isolated testing
3. **Use data-testid attributes** for reliable element selection
4. **Test user interactions** with fireEvent and waitFor
5. **Verify API calls** through MSW request interception

### Backend Testing  
1. **Test business logic separately** from API routes
2. **Use integration tests** for full request/response cycles
3. **Mock external dependencies** like databases appropriately
4. **Test error scenarios** and edge cases
5. **Verify timezone handling** in date/time operations

### Coverage Guidelines
- **Write comprehensive tests** for critical business logic
- **Test edge cases** and error conditions
- **Include integration tests** for component interactions
- **Mock external dependencies** to ensure reliable test execution
- **Use descriptive test names** that explain the expected behavior

## Configuration Details

### Jest Projects Configuration
The `jest.config.js` uses a projects-based setup allowing:
- Different environments (Node.js vs jsdom)
- Separate module resolution for frontend/backend
- Independent coverage collection and thresholds
- Parallel test execution

### MSW Integration
MSW is configured to:
- Start before all tests begin
- Reset handlers between individual tests
- Clean up after all tests complete
- Provide realistic API responses for development

This testing infrastructure ensures code quality, prevents regressions, and supports confident refactoring through comprehensive test coverage.
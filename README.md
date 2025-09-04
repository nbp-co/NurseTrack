# NurseTrack - Healthcare Workforce Management

A comprehensive nurse scheduling and contract management web application built with React 18, TypeScript, and modern web technologies.

## Features

- **Contract Management**: Create and manage nursing contracts with multi-step wizard
- **Shift Scheduling**: Calendar-based shift management with day detail views
- **Dashboard Analytics**: Custom SVG donut charts and statistics cards
- **Expense Tracking**: Track work-related expenses with categorization and filtering
- **Responsive Design**: Mobile-first design with adaptive navigation
- **Authentication**: Email/password login system (Google OAuth placeholder)

## Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe JavaScript for better development experience
- **Vite** - Fast build tool and development server
- **TailwindCSS** - Utility-first CSS framework
- **Wouter** - Lightweight client-side routing
- **TanStack Query** - Data fetching and state management
- **React Hook Form** - Performant forms with validation
- **Zod** - Runtime type validation
- **Lucide React** - Beautiful icons
- **Radix UI** - Accessible UI components

### Backend
- **Express.js** - Node.js web framework
- **In-memory storage** - Mock data layer for development
- **RESTful API** - Standard HTTP API design

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nursetrack
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run check` - Run TypeScript compiler check
- `npm test` - Run test suite
- `npm run db:push` - Push database schema changes
- `tsx scripts/audit-contracts.ts -- --all` - Audit all contract seed integrity
- `tsx scripts/audit-contracts.ts -- --id=123` - Audit specific contract

## Continuous Integration

### Required Checks for Pull Requests

All pull requests must pass the following automated checks before merging:

#### ✅ Build & Type Safety
- **Build**: `npm run build --if-present` - Ensures the application builds successfully
- **TypeScript**: `npm run typecheck --if-present` - Validates all TypeScript code compiles without errors

#### ✅ Code Quality  
- **Linting**: `npm run lint --if-present` - Ensures code follows project standards
- **Testing**: `npm test -- --ci --reporters=default --coverage` - Runs full test suite with coverage reporting

#### ✅ Test Coverage Requirements

The CI enforces minimum coverage thresholds for critical components:

- **Contracts Service** (`server/services/contracts.ts`): 80% coverage minimum
  - Lines: 80% | Functions: 80% | Branches: 80% | Statements: 80%

- **API Routes** (`server/routes.ts`): 80% coverage minimum  
  - Lines: 80% | Functions: 80% | Branches: 80% | Statements: 80%

### CI Workflow

The GitHub Actions workflow runs on:
- Push to `main` and `develop` branches
- All pull requests targeting `main` and `develop`

**Infrastructure:**
- Node.js 20 environment
- PostgreSQL 15 test database
- Clean npm cache installation
- Comprehensive test execution with coverage reporting

### Branch Protection

Configure your repository's branch protection rules to require:
1. CI workflow completion
2. Up-to-date branches before merging
3. At least one approving review (recommended)

### Local Testing

Run the same checks locally before pushing:

```bash
# Full CI validation locally
npm run typecheck --if-present
npm run lint --if-present  
npm run build --if-present
npm test -- --ci --coverage
```

### Test Infrastructure

The project includes comprehensive testing utilities:

- **Test Factories**: Pre-built data factories for contracts and schedules
- **Database Helpers**: Automatic database seeding and cleanup between tests
- **Coverage Reporting**: HTML and LCOV coverage reports generated in `/coverage`

## Auditing Contract Seeds

The system includes comprehensive audit capabilities to ensure contract shift seeding integrity and detect inconsistencies between scheduled shifts and actual database entries.

### Overview

Contract seeding audit compares expected shifts (generated from contract schedules) against actual shifts in the database, identifying:

- **Missing shifts**: Expected shifts not found in the shifts table
- **Duplicate shifts**: Multiple shifts for the same date from contract seeding
- **Finalized conflicts**: Count of finalized shifts that would be affected by re-seeding

### Usage

#### Audit All Contracts
```bash
tsx scripts/audit-contracts.ts -- --all
```

#### Audit Specific Contract
```bash
tsx scripts/audit-contracts.ts -- --id=123
```

### Sample Output

```
🔍 Auditing all contracts...

📊 Contract Seed Audit Results
===============================================
ID | Contract                  | Status      | Expected | Actual | Missing | Duplicates | Finalized
---+---------------------------+-------------+----------+--------+---------+------------+-----------
1  | Memorial Hospital ICU     | ✅ Healthy  | 84       | 84     | 0       | 0          | 0
2  | City General ER          | ⚠️  Issues  | 72       | 70     | 2       | 0          | 1
3  | Regional Medical Center   | ⚠️  Issues  | 96       | 98     | 0       | 2          | 0
---+---------------------------+-------------+----------+--------+---------+------------+-----------
Summary: 1 healthy, 2 with issues

🔍 Detailed Issues:

Contract 2 (City General ER):
  Missing shifts (2): 2024-09-15, 2024-09-22
  ⚠️  1 finalized shifts would be affected by re-seeding

Contract 3 (Regional Medical Center):
  Duplicate shifts (2): 2024-09-08, 2024-09-12

💡 To fix issues:
   Run: PUT /api/contracts/:id (with seedShifts: true) to resync shifts
   This will add missing shifts and preserve finalized ones
```

### Warning Logs

The audit automatically logs warnings for contracts with issues:

```
[AUDIT] Contract 2 (City General ER) has seeding issues:
  Missing shifts: 2 dates - 2024-09-15, 2024-09-22
  1 finalized shifts would be affected by re-seeding
```

### Audit Results

Each audit returns detailed information:

- **Contract ID & Name**: Basic contract identification
- **Status**: `healthy` or `has_issues` 
- **Expected vs Actual**: Shift count comparison
- **Missing**: Array of dates missing shifts (YYYY-MM-DD format)
- **Duplicates**: Array of dates with multiple shifts
- **Finalized Touched**: Count of finalized shifts affected by potential re-seeding

### Integration

The audit utility can be integrated into:

- **Monitoring scripts**: Regular health checks
- **CI/CD pipelines**: Post-deployment validation
- **Administrative tools**: Manual troubleshooting
- **Automated repairs**: Detection before re-seeding

## Contributing

1. Create a feature branch from `develop`
2. Make your changes following the existing code style
3. Add tests for new functionality
4. Ensure all CI checks pass locally
5. Submit a pull request

## License

MIT

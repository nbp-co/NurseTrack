# NurseTrack - Healthcare Workforce Management

## Overview

NurseTrack is a comprehensive healthcare workforce management web application designed for nursing professionals. The system provides contract management, shift scheduling, expense tracking, and analytics through a modern, mobile-first interface. Built with React 18 and TypeScript, it features a responsive design with separate mobile and desktop navigation patterns, real-time data management, and intuitive workflow management for healthcare workers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React 18 with TypeScript**: Modern functional components with hooks-based state management
- **Vite Build System**: Fast development server and optimized production builds
- **TailwindCSS**: Utility-first CSS framework with custom design tokens and responsive breakpoints
- **Wouter Routing**: Lightweight client-side routing for SPA navigation
- **Responsive Layout Strategy**: Mobile-first design with breakpoint-based navigation (bottom tabs on mobile, sidebar on desktop)

### State Management & Data Flow
- **TanStack Query**: Server state management with caching, background updates, and optimistic updates
- **React Hook Form + Zod**: Form state management with runtime validation and type safety
- **In-Memory Mock API**: Development-time data layer simulating REST endpoints for contracts, shifts, expenses, and user management

### UI Component System
- **Radix UI Primitives**: Accessible, unstyled components for complex interactions (dialogs, dropdowns, forms)
- **Shadcn/ui Components**: Pre-built component library with consistent styling and behavior
- **Custom SVG Charts**: Hand-built donut chart components for dashboard analytics
- **Modal/Sheet Pattern**: Overlay-based forms for create/edit operations instead of separate pages

### Data Models & Business Logic
- **Contract Management**: Multi-step wizard for contract creation with recurring shift rules (BYDAY patterns)
- **Shift Scheduling**: Calendar-based interface with day detail views and shift confirmation workflows
- **Expense Tracking**: Categorized expense management with contract association and deductible tracking
- **Metrics Calculation**: Real-time dashboard analytics for completion rates, earnings, and weekly summaries

### Authentication & Security
- **Email/Password Authentication**: Basic credential-based auth with session management
- **Route Protection**: Automatic redirects for unauthenticated users
- **Future OAuth Integration**: Placeholder implementation for Google OAuth

### Performance Optimizations
- **Code Splitting**: Vite-based automatic chunking for optimal loading
- **Query Caching**: TanStack Query with infinite stale time for development
- **Optimistic Updates**: Immediate UI feedback for user actions
- **Mobile Performance**: Safe area handling and touch-optimized interactions

## External Dependencies

### Core Framework Dependencies
- **React 18**: Frontend framework with hooks and concurrent features
- **TypeScript**: Static typing and enhanced developer experience
- **Vite**: Build tool and development server
- **TailwindCSS**: Utility-first CSS framework

### UI & Interaction Libraries
- **Radix UI Components**: Accessible primitives (@radix-ui/react-*)
- **Lucide React**: Icon library for consistent iconography
- **React Hook Form**: Form state management
- **Zod**: Runtime schema validation

### Data Management
- **TanStack Query**: Server state management and caching
- **Wouter**: Lightweight routing library
- **Date-fns**: Date manipulation and formatting utilities

### Database & ORM (Prepared)
- **Drizzle ORM**: Type-safe database queries and migrations
- **PostgreSQL**: Primary database (via @neondatabase/serverless)
- **Drizzle-Kit**: Database migration and schema management tools

### Development Tools
- **Replit Integration**: Development environment plugins and error handling
- **ESBuild**: Fast JavaScript bundling for production
- **Connect-PG-Simple**: PostgreSQL session store for production deployment

### Backend Framework (Express)
- **Express.js**: Node.js web server framework
- **CORS & Security**: Cross-origin resource sharing and basic security headers
- **Session Management**: Stateful authentication with database session storage

## Recent Updates

### DST-Safe Contracts API Implementation (September 2025)
- Implemented comprehensive contracts service with timezone-aware business logic
- Added Luxon library for proper DST handling and timezone conversions
- Created timezone-safe shift generation with proper UTC storage and local time tracking
- Built contract lifecycle management with schedule validation and bulk operations
- Developed extensive unit and integration test suites for contracts service
- Enhanced API endpoints for contract creation, updates, status management, and schedule seeding

### Contact Information Enhancement (August 2025)
- Added comprehensive contact information section to contract basics step
- New fields include: address, contact name, phone number, and notes
- Contact information appears at bottom of basics page with clear visual separation
- Updated schema and types to support new fields
- Enhanced review step to display contact information in summary

## Implementation Architecture

### Timezone & DST Handling
- **UTC Storage**: All timestamps stored as UTC in database using timestamptz
- **Local Tracking**: Date fields store local dates, timezone stored per contract
- **Luxon Integration**: Handles DST transitions and timezone conversions automatically
- **Schedule Management**: Day-specific overrides with proper local time preservation

### Contracts Service
- **Business Logic Separation**: Core logic isolated from API routes
- **Shift Seeding**: Automatic generation of shifts based on contract schedules
- **Schedule Validation**: Comprehensive validation for recurring patterns
- **Contract Lifecycle**: Status transitions and update workflows
- **Test Coverage**: Unit tests for business logic, integration tests for API endpoints
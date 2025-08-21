# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atlas DAO is a payment gateway system that integrates PIX payments with DePix (Liquid Network), enabling instant conversion between Brazilian fiat currency and digital assets. The project consists of:

- **Atlas-API**: NestJS backend API (port 19997) handling authentication, payments, and administration
- **Atlas-Panel**: Next.js frontend dashboard (port 11337) for user and admin interfaces

## Commands

### Atlas-API (Backend)
```bash
# Install dependencies
cd Atlas-API && npm install

# Database setup
npx prisma migrate dev
npx prisma db seed

# Development
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Testing
npm run test              # Unit tests
npm run test:e2e         # End-to-end tests
npm run test:integration # Integration tests
npm run test:cov         # Coverage report

# Linting
npm run lint
```

### Atlas-Panel (Frontend)
```bash
# Install dependencies
cd Atlas-Panel && npm install

# Development (Turbopack)
npm run dev

# Build
npm run build

# Production
npm run start

# Linting
npm run lint
```

## Architecture

### Backend (Atlas-API)

The API follows a modular NestJS architecture with clear separation of concerns:

- **Authentication**: Dual authentication system supporting JWT for web sessions and API Keys for integrations
  - JWT tokens with refresh capability
  - Hashed API keys stored in database
  - Role-based access control (USER/ADMIN)

- **Core Modules**:
  - `auth/`: Authentication, authorization, JWT strategies, guards
  - `pix/`: PIX payment processing and QR code generation
  - `eulen/`: Integration with Eulen API for payment processing
  - `admin/`: Administrative functions and user management
  - `payment-link/`: Short payment link generation and management
  - `account-validation/`: Account verification through R$1 payment

- **Data Layer**:
  - PostgreSQL database with Prisma ORM
  - Repository pattern in `repositories/` for data access
  - Transaction support with automatic audit logging

- **Security Features**:
  - Rate limiting per user
  - Request validation with class-validator
  - Audit logging for sensitive operations
  - Password reset with 6-digit codes via email

### Frontend (Atlas-Panel)

Next.js 15 app with App Router:

- **Route Structure**:
  - `(auth)/`: Public authentication pages (login, register, password reset)
  - `(dashboard)/`: Protected dashboard routes
  - `admin/`: Admin-only sections for user and transaction management
  - `pay/[shortCode]/`: Public payment pages via short links

- **State Management**:
  - React Query for server state and caching
  - Cookie-based JWT token storage
  - Middleware for route protection

## Database Schema

Key models in Prisma:
- **User**: Authentication, roles, API keys, limits
- **Transaction**: PIX payment records with status tracking
- **PaymentLink**: Short payment links with metadata
- **ApiKeyRequest**: Request tracking for API key generation
- **AuditLog**: System-wide audit trail

## API Integration

The frontend communicates with the backend via:
- Base URL: `http://localhost:19997/api/v1`
- Authentication: Bearer token in Authorization header or X-API-Key header
- All responses follow consistent error format with status codes

## Transaction Limits

MED/Plebank regulatory compliance:
- Minimum: R$ 0.01
- Maximum per transaction: R$ 35,000.00
- Maximum monthly: R$ 35,000.00

## Environment Variables

Required environment variables for Atlas-API:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET`: JWT signing keys
- `SMTP_*`: Email service configuration
- `EULEN_API_URL`, `EULEN_API_KEY`: Payment processor integration
- `FRONTEND_URL`: Frontend URL for CORS

## Testing Strategy

- Unit tests for services and controllers
- Integration tests for external API calls (Eulen)
- E2E tests for complete user flows
- Use `npm run test:unit` to exclude integration tests during development

## Key Considerations

1. Always validate user limits before processing transactions
2. Audit logs are automatically created for sensitive operations
3. API keys are hashed before storage - raw keys cannot be recovered
4. Payment links include automatic expiration and usage tracking
5. The system uses soft deletes for users (isActive flag)
6. Transaction cleanup service runs periodically for abandoned transactions
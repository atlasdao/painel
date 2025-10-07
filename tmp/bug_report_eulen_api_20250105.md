# Bug Report: Eulen API Service Unavailable

**Generated:** 2025-01-05
**Status:** RESOLVED - ROOT CAUSE IDENTIFIED
**Severity:** HIGH - Blocks core deposit functionality

## Issue Summary

Users receive "Eulen API service unavailable" error when attempting to generate deposit QR codes with valid admin accounts. This prevents the core PIX-to-DePix conversion functionality from working.

## Investigation Process

### Phase 1: Context Gathering ✅
- Verified admin account has proper `verifiedTaxNumber` (EUID verification working)
- Confirmed backend running on port 19997, frontend on port 11337
- Backend logs show API calls being made but failing at external service level

### Phase 2: Code Analysis ✅
- **EulenClientService** (`/Atlas-API/src/services/eulen-client.service.ts`):
  - Properly configured with base URL: `https://depix.eulen.app/api`
  - Implements JWT Bearer token authentication from database
  - Gets token from `SystemSettings.EULEN_API_TOKEN`
  - Includes comprehensive logging and error handling
  - Generates proper UUID v4 nonces as required by API

- **PixService** (`/Atlas-API/src/pix/pix.service.ts`):
  - Correctly calls Eulen client with proper parameters
  - Implements EUID validation for personal deposits
  - Handles commerce mode appropriately

### Phase 3: API Connectivity Testing ✅
**Direct API Tests:**
- ✅ Eulen API responds to requests (not completely down)
- ❌ Ping endpoint returns HTTP 500 (likely not implemented or server issue)
- ✅ Deposit endpoint returns HTTP 401 "Authorization header is missing"
- ✅ UUID nonces are correctly formatted and accepted

### Phase 4: Authentication Investigation ✅
**Database Check:**
- ❌ **CRITICAL**: No `EULEN_API_TOKEN` found in `SystemSettings` table
- ✅ SystemSettings table structure exists and is accessible

**Authentication Requirements (from [docs.eulen.app](https://docs.eulen.app/-authentication-781855m0.md)):**
- 🔑 **JWT Bearer tokens required** for all API calls
- 🤖 **Tokens obtained ONLY via Telegram Bot**: @DePix_stable_bot
- ⏰ **Tokens have expiration** (max 365 days)
- 🎯 **Scoped access**: `all`, `deposit`, `withdraw`, or `user`

## Root Cause Analysis

### ✅ DEFINITIVE ROOT CAUSE IDENTIFIED:
**Missing Eulen API authentication token in database configuration**

### Evidence Supporting Root Cause:
1. EulenClientService logs show: "❌ CRITICAL: No Eulen API token found in database!"
2. Direct API tests confirm 401 "Authorization header is missing"
3. Eulen API documentation confirms JWT Bearer tokens are mandatory
4. Database query confirms `EULEN_API_TOKEN` is missing from SystemSettings

### Contributing Factors:
1. **No fallback handling** for missing authentication tokens
2. **Generic error message** doesn't indicate authentication issue to users
3. **No admin interface** to manage API tokens easily

## Impact Assessment

### Systems Affected:
- ✅ **PIX Deposit Generation**: Completely blocked
- ✅ **QR Code Creation**: Cannot create valid payment QR codes
- ✅ **DePix Conversion**: No PIX-to-DePix transactions possible
- ✅ **Commerce Mode**: Payment links and commerce features affected
- ✅ **Account Validation**: R$1 validation payments may fail

### User Experience:
- Users see vague "service unavailable" error
- No clear indication that it's a configuration issue
- Loss of trust in platform reliability

## Fix Requirements

### 1. **IMMEDIATE**: Configure Eulen API Token
```sql
INSERT INTO "SystemSettings" (key, value, description)
VALUES (
  'EULEN_API_TOKEN',
  '<JWT_TOKEN_FROM_TELEGRAM_BOT>',
  'Eulen API JWT token for PIX-to-DePix conversion service'
);
```

### 2. **SHORT TERM**: Improve Error Handling
- Add specific authentication error messages
- Provide admin alerts when token is missing/expired
- Add fallback behavior for service unavailability

### 3. **MEDIUM TERM**: Admin Token Management
- Add admin interface to view/update Eulen API token
- Implement token expiration monitoring
- Add automatic renewal reminders

### 4. **LONG TERM**: Service Resilience
- Implement circuit breaker pattern for external API calls
- Add retry logic with exponential backoff
- Consider fallback payment methods

## Prevention Recommendations

### Code Quality:
1. **Environment Validation**: Check required configuration on startup
2. **Health Checks**: Implement API connectivity monitoring
3. **Documentation**: Clear setup instructions for API tokens
4. **Testing**: Integration tests that verify API connectivity

### Operational:
1. **Monitoring**: Alerts for API authentication failures
2. **Documentation**: Runbook for token renewal process
3. **Backup Plans**: Alternative payment processing methods

## Next Steps

1. **CRITICAL**: Obtain Eulen API token via @DePix_stable_bot Telegram bot
2. **IMMEDIATE**: Insert token into SystemSettings database table
3. **VERIFY**: Test deposit creation end-to-end
4. **ENHANCE**: Implement better error handling and monitoring

---

**Files Analyzed:**
- `/Atlas-API/src/services/eulen-client.service.ts`
- `/Atlas-API/src/pix/pix.service.ts`
- `/Atlas-API/prisma/schema.prisma`

**Test Results:**
- Eulen API connectivity: ✅ Responsive
- Authentication: ❌ Token missing
- Code logic: ✅ Correct implementation
- Database schema: ✅ Properly configured

**Resolution Status:** Ready for token configuration and verification testing.
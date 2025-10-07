# Bug Report: Login Failure - "Erro ao fazer login"

## Issue Summary
Users are unable to login to the Atlas Panel application. The frontend displays the error message "Erro ao fazer login" when attempting to login with valid credentials.

## Investigation Process

### 1. Frontend Code Analysis
- **File**: `/Volumes/NEWATLAS/Drive/DEV/Atlas Painel/Atlas-Panel/app/(auth)/login/page.tsx`
- **Observation**: Login page correctly calls `authService.login()` and handles errors

### 2. Auth Service Analysis
- **File**: `/Volumes/NEWATLAS/Drive/DEV/Atlas Painel/Atlas-Panel/app/lib/auth.ts`
- **Observation**: The auth service expects token fields named `access_token` and `refresh_token`

### 3. API Configuration Check
- **File**: `/Volumes/NEWATLAS/Drive/DEV/Atlas Painel/Atlas-Panel/app/lib/api.ts`
- **Observation**: API URL correctly set to `http://localhost:19997/api/v1` via environment variable

### 4. Backend Endpoint Testing
- **Test 1**: `curl http://localhost:19997/api/auth/login` → 404 Not Found
- **Test 2**: `curl http://localhost:19997/auth/login` → 404 Not Found
- **Test 3**: `curl http://localhost:19997/api/v1/auth/login` → Works! Returns 401 for invalid credentials
- **Test 4**: With valid credentials (`admin@atlas.com`/`admin123`) → Returns successful response

### 5. Response Structure Analysis
The backend returns:
```json
{
  "accessToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": {...}
}
```

But the frontend expects:
```javascript
const { access_token, refresh_token, user } = response.data;
```

## Root Cause Analysis

### Primary Issue: Field Name Mismatch
The backend API returns `accessToken` (camelCase) but the frontend expects `access_token` (snake_case).

**Evidence:**
- Backend response: `"accessToken": "eyJhbG..."`
- Frontend code (line 24): `const { access_token, refresh_token, user } = response.data;`

This causes `access_token` to be `undefined`, triggering the error "Token não recebido do servidor" at line 26-28 of auth.ts.

### Secondary Issue: Missing Refresh Token
The backend doesn't return a `refresh_token` field in the login response, only `accessToken`.

## Impact Assessment
- **Affected Systems**: All login functionality
- **User Impact**: 100% of users cannot login
- **Business Impact**: Complete system unavailability

## Fix Requirements

### Option 1: Update Frontend (Recommended - Less Breaking)
Update the auth service to handle the camelCase field names from the backend:

**File to modify**: `/Volumes/NEWATLAS/Drive/DEV/Atlas Painel/Atlas-Panel/app/lib/auth.ts`

Line 24 needs to change from:
```javascript
const { access_token, refresh_token, user } = response.data;
```

To:
```javascript
const { accessToken, tokenType, user } = response.data;
const access_token = accessToken;
const refresh_token = ''; // Backend doesn't return refresh token on login
```

Similar changes needed at:
- Line 42: Update cookie setting to use `access_token` variable
- Line 48: Handle empty refresh_token
- Lines 74, 92, 123, 157, 173, 209: Similar updates for other auth methods

### Option 2: Update Backend
Modify the backend to return snake_case field names matching frontend expectations:
- Change `accessToken` to `access_token`
- Add `refresh_token` field to response

**Files to modify**:
- `/Volumes/NEWATLAS/Drive/DEV/Atlas Painel/Atlas-API/src/auth/auth.service.ts`
- `/Volumes/NEWATLAS/Drive/DEV/Atlas Painel/Atlas-API/src/common/dto/auth.dto.ts`

## Prevention Recommendations

1. **API Contract Testing**: Implement contract tests between frontend and backend to catch field name mismatches
2. **TypeScript Interfaces**: Share interface definitions between frontend and backend
3. **API Documentation**: Maintain OpenAPI/Swagger documentation and generate types from it
4. **Integration Tests**: Add E2E tests for critical flows like login
5. **Consistent Naming Convention**: Standardize on either camelCase or snake_case across the entire application

## Testing Requirements

After fix implementation:
1. Test login with valid credentials
2. Test login with invalid credentials
3. Test 2FA flow for users with 2FA enabled
4. Test refresh token flow
5. Test logout functionality
6. Test session persistence

## Recommended Fix Implementation

I recommend implementing Option 1 (Frontend update) as it's less breaking and can be deployed immediately without backend changes.
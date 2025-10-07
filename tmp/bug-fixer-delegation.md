# Profile Photo Upload Bug Fix - Delegation Instructions

## TASK ASSIGNMENT: Bug-Fixer Agent

### PRIORITY: HIGH - User-facing feature not working

### BACKGROUND
Complete investigation has been conducted. The profile photo upload system is architecturally sound but experiencing runtime issues preventing users from uploading photos.

### SYSTEM ARCHITECTURE (Verified Working)
- **Backend**: NestJS with Sharp.js image processing
- **Frontend**: Next.js with drag-drop upload component
- **Database**: PostgreSQL with profilePicture TEXT field
- **Authentication**: JWT-based with proper guards
- **Storage**: Base64 data URLs in database

### IDENTIFIED ROOT CAUSES TO FIX

#### 1. AUTHENTICATION FLOW ISSUES
**Problem**: JWT token handling may be failing during upload
**Location**: `/Atlas-Panel/app/lib/api.ts` and `/Atlas-Panel/app/lib/services.ts`
**Fix Required**:
- Add request interceptors to ensure JWT is always included
- Add proper error handling for 401 responses
- Implement token refresh logic if needed

#### 2. ERROR HANDLING & DEBUGGING
**Problem**: Insufficient error reporting making diagnosis difficult
**Locations**:
- `/Atlas-API/src/profile/profile.controller.ts`
- `/Atlas-API/src/profile/profile.service.ts`
- `/Atlas-Panel/app/components/AvatarUploader.tsx`
**Fix Required**:
- Add comprehensive logging throughout upload chain
- Improve error messages for users (in Portuguese)
- Add network error detection and retry logic

#### 3. FILE PROCESSING ROBUSTNESS
**Problem**: Sharp.js or base64 processing may fail silently
**Location**: `/Atlas-API/src/profile/profile.service.ts` (lines 137-198)
**Fix Required**:
- Add try-catch around Sharp.js operations
- Add fallback for when Sharp fails
- Validate base64 data before processing
- Add progress tracking for large files

#### 4. FRONTEND UX IMPROVEMENTS
**Problem**: Users don't get clear feedback on upload status/failures
**Location**: `/Atlas-Panel/app/components/AvatarUploader.tsx`
**Fix Required**:
- Add more detailed loading states
- Show upload progress if possible
- Better error messages with retry options
- Validate file types and sizes before upload attempt

### SPECIFIC TASKS TO COMPLETE

#### Task 1: Fix Authentication Flow
```typescript
// Add to /Atlas-Panel/app/lib/api.ts
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle token expiration
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

#### Task 2: Enhance Backend Error Handling
Add detailed logging and validation to ProfileService.uploadAvatar()

#### Task 3: Improve Frontend Error Handling
Add comprehensive error states and retry logic to AvatarUploader component

#### Task 4: Test Upload Flow End-to-End
Create test script that simulates real user upload with authentication

### SUCCESS CRITERIA
- [ ] Users can upload photos without errors
- [ ] Clear error messages displayed in Portuguese
- [ ] Photos persist in database correctly
- [ ] UI updates immediately after successful upload
- [ ] Works on both desktop and mobile
- [ ] No console errors during upload process

### TESTING REQUIREMENTS
1. Test with real JWT token from logged-in user
2. Test with various image formats (PNG, JPEG, WebP)
3. Test with different file sizes (1KB to 5MB)
4. Test error scenarios (invalid files, network issues)
5. Verify database persistence
6. Test UI responsiveness during upload

### FILES TO MODIFY
Primary files requiring fixes:
- `/Atlas-Panel/app/lib/api.ts` - Auth interceptors
- `/Atlas-Panel/app/components/AvatarUploader.tsx` - Error handling
- `/Atlas-API/src/profile/profile.service.ts` - Robust processing
- `/Atlas-API/src/profile/profile.controller.ts` - Enhanced logging

### NEXT AGENT HANDOFF
After bug-fixer completes implementation:
1. Hand off to test-writer agent for comprehensive testing
2. Verify all success criteria are met
3. Update CLAUDE.md with resolution details

---

**CRITICAL**: This is a user-facing feature that directly impacts user experience. Prioritize reliability and clear error communication over complex features.
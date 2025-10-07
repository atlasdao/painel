# Profile Photo Upload Testing - Delegation Instructions

## TASK ASSIGNMENT: Test-Writer Agent

### PRIORITY: HIGH - Critical user feature verification

### CONTEXT
Bug-fixer agent has implemented fixes for profile photo upload functionality. Your task is to create comprehensive tests and verify the complete fix works end-to-end.

### TESTING OBJECTIVES

#### 1. UNIT TESTING
Create tests for individual components:
- `ProfileService.uploadAvatar()` method
- `AvatarUploader` React component
- API authentication flow
- Base64 conversion utilities

#### 2. INTEGRATION TESTING
Test complete upload flow:
- Frontend → API → Database → Frontend update
- Authentication token handling
- Error propagation and user feedback
- Database persistence verification

#### 3. USER ACCEPTANCE TESTING
Simulate real user scenarios:
- Upload from settings page
- Various file types and sizes
- Mobile and desktop workflows
- Error recovery scenarios

### SPECIFIC TEST CASES TO IMPLEMENT

#### Test Suite 1: Backend API Tests
```bash
# Location: /Atlas-API/src/profile/profile.service.spec.ts

1. Test successful avatar upload with valid base64 data
2. Test avatar upload with oversized file (should compress)
3. Test avatar upload with invalid base64 data
4. Test avatar upload without authentication
5. Test avatar deletion functionality
6. Test Sharp.js processing with various image formats
7. Test database persistence after upload
```

#### Test Suite 2: Frontend Component Tests
```bash
# Location: /Atlas-Panel/app/components/__tests__/AvatarUploader.test.tsx

1. Test file selection and preview
2. Test drag-and-drop functionality
3. Test upload progress indication
4. Test error message display
5. Test file type validation
6. Test file size validation
7. Test retry functionality
```

#### Test Suite 3: End-to-End Tests
```bash
# Location: /Atlas-Panel/cypress/e2e/avatar-upload.cy.ts

1. Test complete upload workflow as logged-in user
2. Test upload from settings page
3. Test avatar display after upload
4. Test error handling for network issues
5. Test upload with expired token
6. Test mobile responsive upload interface
```

#### Test Suite 4: Performance Tests
```bash
# Location: /Atlas-API/test/performance/avatar-upload.spec.ts

1. Test upload speed with various file sizes
2. Test memory usage during Sharp.js processing
3. Test concurrent upload handling
4. Test upload timeout scenarios
```

### TESTING TOOLS TO USE
- **Jest** - Unit testing for both frontend and backend
- **React Testing Library** - Frontend component testing
- **Supertest** - Backend API endpoint testing
- **Cypress** - End-to-end browser testing
- **Prisma Testing** - Database integration testing

### VALIDATION CRITERIA

#### Functional Tests
- [ ] Users can upload photos successfully
- [ ] Photos display correctly after upload
- [ ] Error messages are clear and in Portuguese
- [ ] File validation works correctly
- [ ] Authentication is properly enforced

#### Technical Tests
- [ ] API endpoints return correct status codes
- [ ] Database updates are persisted
- [ ] Images are processed and compressed correctly
- [ ] Memory usage is within acceptable limits
- [ ] No console errors during normal operation

#### UX Tests
- [ ] Upload progress is visible to users
- [ ] Drag-and-drop interface works smoothly
- [ ] Mobile interface is fully functional
- [ ] Error recovery allows users to retry
- [ ] UI updates immediately after successful upload

### TESTING WORKFLOW

#### Phase 1: Automated Testing
1. Run existing test suites to ensure no regressions
2. Create new unit tests for avatar upload functionality
3. Implement integration tests for API endpoints
4. Add component tests for AvatarUploader

#### Phase 2: Manual Testing
1. Test upload workflow in development environment
2. Verify with real user accounts and sessions
3. Test various image files (PNG, JPEG, WebP, GIF)
4. Test edge cases (very small/large files, unusual formats)

#### Phase 3: End-to-End Validation
1. Deploy fixes to staging environment
2. Run full regression test suite
3. Perform user acceptance testing
4. Verify mobile device compatibility

### TEST DATA REQUIREMENTS
Create test fixtures:
- Sample images in various formats (PNG, JPEG, WebP)
- Different file sizes (1KB, 100KB, 1MB, 5MB)
- Invalid files (non-images, corrupted files)
- Test user accounts with valid JWT tokens

### SUCCESS METRICS
- [ ] 100% test coverage for avatar upload functionality
- [ ] All automated tests pass
- [ ] Manual testing confirms working end-to-end flow
- [ ] Performance tests show acceptable response times
- [ ] No critical bugs identified during testing

### DELIVERABLES

#### Test Code
1. Complete Jest test suites for backend and frontend
2. Cypress end-to-end tests
3. Performance test scripts
4. Test data fixtures and utilities

#### Documentation
1. Test execution report with results
2. Performance metrics and analysis
3. Bug report for any issues found
4. User acceptance test results

#### Verification Report
1. Confirmation that all success criteria are met
2. Evidence of database persistence
3. Screenshots/videos of working functionality
4. Mobile compatibility verification

### HANDOFF TO TASK DELEGATOR
After testing completion:
1. Provide comprehensive test results
2. Confirm bug fixes are working correctly
3. Document any remaining issues for follow-up
4. Update CLAUDE.md with final verification status

---

**CRITICAL**: This testing phase is essential to ensure the profile photo upload feature is production-ready and provides a smooth user experience.
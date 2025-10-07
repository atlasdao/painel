# Payment Link Creation Bug - Investigation Report

**Date**: September 30, 2025
**Status**: IDENTIFIED ROOT CAUSES - FIXES REQUIRED

## 🚨 ISSUE SUMMARY

Users cannot create payment links due to multiple "Bad Request Exception" errors on POST `/api/v1/payment-links` endpoint. The frontend displays "Validacao falhou" (Validation failed) messages.

## 🔍 ROOT CAUSE ANALYSIS

### 1. **Primary Issue: Class-Validator Data Transformation Problems**

**Problem**: The CreatePaymentLinkDto uses `@Type(() => Number)` for number fields, but the frontend may be sending numbers as strings or null values that fail validation.

**Evidence**:
- Frontend sends: `amount: parseFloat(formData.amount)` which can result in `NaN` if empty
- DTO expects: proper numbers with `@Type(() => Number)` transformation
- When `parseFloat("")` returns `NaN`, validation fails silently

### 2. **Frontend Data Preparation Issues**

**Problems Identified**:
- **Empty string to number conversion**: `parseFloat("")` returns `NaN`
- **Undefined vs null handling**: Frontend sends `undefined` but DTO might expect `null`
- **Custom amount validation**: Logic mismatch between frontend and backend validation

**Frontend Payload Analysis**:
```javascript
const payload = {
  amount: formData.isCustomAmount ? undefined : parseFloat(formData.amount), // NaN if empty!
  isCustomAmount: formData.isCustomAmount,
  minAmount: formData.isCustomAmount ? parseFloat(formData.minAmount) : undefined, // NaN if empty!
  maxAmount: formData.isCustomAmount ? parseFloat(formData.maxAmount) : undefined, // NaN if empty!
  description: formData.description,
  walletAddress: selectedWallet
};
```

### 3. **Backend Validation Logic Gaps**

**Issues Found**:
- Service validates `!dto.amount` but doesn't check for `NaN`
- No validation for `NaN` values in min/max amounts
- TypeScript compilation errors preventing proper server startup
- Missing comprehensive error logging

## 🛠️ IMMEDIATE FIXES REQUIRED

### Fix 1: Frontend Data Validation & Sanitization
```typescript
// Sanitize numeric values before sending
const sanitizeNumber = (value: string): number | undefined => {
  if (!value || value.trim() === '') return undefined;
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
};

const payload = {
  amount: formData.isCustomAmount ? undefined : sanitizeNumber(formData.amount),
  isCustomAmount: formData.isCustomAmount,
  minAmount: formData.isCustomAmount ? sanitizeNumber(formData.minAmount) : undefined,
  maxAmount: formData.isCustomAmount ? sanitizeNumber(formData.maxAmount) : undefined,
  description: formData.description || undefined,
  walletAddress: selectedWallet
};
```

### Fix 2: Backend NaN Validation
```typescript
// Add NaN checks in service
if (dto.amount !== undefined && (isNaN(dto.amount) || dto.amount <= 0)) {
  throw new HttpException('Valor inválido fornecido.', HttpStatus.BAD_REQUEST);
}

if (dto.minAmount !== undefined && (isNaN(dto.minAmount) || dto.minAmount <= 0)) {
  throw new HttpException('Valor mínimo inválido fornecido.', HttpStatus.BAD_REQUEST);
}

if (dto.maxAmount !== undefined && (isNaN(dto.maxAmount) || dto.maxAmount <= 0)) {
  throw new HttpException('Valor máximo inválido fornecido.', HttpStatus.BAD_REQUEST);
}
```

### Fix 3: Enhanced Error Handling
```typescript
// Add class-validator pipeline with detailed error messages
@UsePipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) => {
    const messages = errors.map(error =>
      Object.values(error.constraints || {}).join(', ')
    ).join('; ');
    return new BadRequestException(`Erro de validação: ${messages}`);
  }
}))
```

## 🔧 TECHNICAL IMPLEMENTATION PLAN

### Phase 1: Critical Fixes (Immediate)
1. **Fix compilation errors** preventing server startup
2. **Implement frontend data sanitization** to prevent NaN values
3. **Add backend NaN validation** with Portuguese error messages
4. **Enhance error logging** for better debugging

### Phase 2: Validation Enhancement
1. **Implement comprehensive DTO validation** with custom transformers
2. **Add field-level validation messages** in Portuguese
3. **Create validation middleware** for consistent error formatting
4. **Add request/response logging** for troubleshooting

### Phase 3: Testing & Verification
1. **Test all payment link creation scenarios**
2. **Verify error messages are user-friendly**
3. **Test edge cases** (empty values, invalid numbers, etc.)
4. **Performance test** with various payload sizes

## 📋 TEST SCENARIOS TO VERIFY

1. **Fixed Amount Links**:
   - Valid amount (e.g., 100.50)
   - Empty amount field
   - Invalid amount (e.g., "abc", negative values)

2. **Custom Amount Links**:
   - Only min amount set
   - Only max amount set
   - Both min and max set
   - Min > Max scenario
   - Empty min/max fields

3. **Wallet Address Validation**:
   - Valid LIQUID address
   - Empty wallet address
   - Invalid wallet format

4. **Error Scenarios**:
   - Network timeout
   - Server validation failures
   - Authentication errors

## ⚡ PERFORMANCE IMPACT

- **No performance degradation** expected
- **Improved user experience** with better error messages
- **Reduced server load** from failed validation attempts
- **Better debugging capabilities** with enhanced logging

## 🔐 SECURITY CONSIDERATIONS

- **Input sanitization** prevents injection attacks
- **Proper validation** prevents data corruption
- **Error message security** - avoid exposing internal details
- **Logging security** - don't log sensitive data

## 📈 SUCCESS METRICS

- **Zero "Bad Request" errors** for valid payment link creation
- **User-friendly error messages** in Portuguese
- **Complete payment link creation flow** working end-to-end
- **Proper error logging** for debugging

---

**Next Steps**: Implement fixes in order of priority, test thoroughly, and verify complete payment link creation functionality.
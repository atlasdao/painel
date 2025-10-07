# PIX Key Validation Bug - Investigation and Fix Plan

## Problem Description
Users are encountering a "Validação falhou" (Validation failed) error when attempting to add PIX keys in the wallet settings (/settings > Carteira). This is a critical issue as it prevents users from configuring their wallets for receiving payments.

## Investigation Plan

### PHASE 1: Initial Investigation (0-15 minutes)

#### Task 1: Frontend Wallet Settings Investigation
- **Assigned to**: bug-fixer
- **Dependencies**: None
- **Priority**: CRITICAL - Execute immediately
- **Deliverables**:
  - Examine `/Atlas-Panel/app/(dashboard)/settings/page.tsx`
  - Locate the wallet/PIX key section in the settings page
  - Identify the form validation logic for PIX keys
  - Check API endpoint being called for PIX key submission
  - Review error handling and display logic
  - Identify the exact validation that's failing
- **Success Criteria**: Understand frontend validation flow and API integration

#### Task 2: Backend Profile/Settings API Investigation
- **Assigned to**: backend-architect
- **Dependencies**: None
- **Priority**: CRITICAL - Execute immediately
- **Deliverables**:
  - Check `/Atlas-API/src/profile/` directory for profile-related endpoints
  - Look for wallet/PIX key update endpoints
  - Review DTOs and validation decorators
  - Check Prisma schema for User wallet fields (pixKey, walletAddress, etc.)
  - Identify backend validation rules for PIX keys
  - Review error messages and their Portuguese translations
- **Success Criteria**: Understand backend validation requirements

### PHASE 2: Deep Analysis (15-30 minutes)

#### Task 3: Frontend Form Validation Analysis
- **Assigned to**: frontend-developer
- **Dependencies**: Task 1 findings
- **Priority**: CRITICAL
- **Deliverables**:
  - Analyze the wallet form component in detail
  - Check client-side validation rules
  - Review form state management
  - Verify API request payload format
  - Check for missing required fields
  - Test different PIX key formats (CPF, CNPJ, email, phone, random key)
- **Implementation Points to Check**:
  ```typescript
  // Expected PIX key validation patterns
  const pixKeyPatterns = {
    cpf: /^\d{11}$/,
    cnpj: /^\d{14}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^\+?[1-9]\d{10,14}$/,
    random: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  };
  ```
- **Success Criteria**: Identify exact validation failing on frontend

#### Task 4: Backend Validation Logic Analysis
- **Assigned to**: backend-engineer
- **Dependencies**: Task 2 findings
- **Priority**: CRITICAL
- **Deliverables**:
  - Review the profile update endpoint implementation
  - Check DTO validation decorators (class-validator)
  - Verify PIX key format validation logic
  - Check for any business rule validations
  - Review error response formatting
  - Test endpoint directly with various PIX key formats
- **Validation Points to Check**:
  ```typescript
  // Expected DTO validation
  class UpdateWalletDto {
    @IsOptional()
    @Matches(pixKeyRegex, { message: 'Chave PIX inválida' })
    pixKey?: string;

    @IsOptional()
    @IsString()
    walletAddress?: string;
  }
  ```
- **Success Criteria**: Identify backend validation rules and error responses

### PHASE 3: Database Schema Verification (30-45 minutes)

#### Task 5: Database Schema Analysis
- **Assigned to**: database-optimizer
- **Dependencies**: Tasks 3-4
- **Priority**: HIGH
- **Deliverables**:
  - Check User table schema in Prisma
  - Verify pixKey and wallet-related fields
  - Check field constraints (length, format, uniqueness)
  - Review any recent migrations affecting wallet fields
  - Verify if encryption is required for PIX keys
- **SQL Queries to Run**:
  ```sql
  -- Check User table structure
  \d "User"

  -- Check existing PIX keys
  SELECT id, email, pixKey, walletAddress
  FROM "User"
  WHERE pixKey IS NOT NULL
  LIMIT 5;

  -- Check for any constraints
  SELECT conname, contype, condeferrable, condeferred
  FROM pg_constraint
  WHERE conrelid = 'User'::regclass;
  ```
- **Success Criteria**: Understand database constraints and field requirements

### PHASE 4: Fix Implementation (45-75 minutes)

#### Task 6: Frontend Fix Implementation
- **Assigned to**: frontend-developer
- **Dependencies**: Tasks 3, 5
- **Priority**: CRITICAL
- **Deliverables**:
  - Fix validation logic in settings page
  - Implement proper PIX key format validation
  - Add clear error messages for each validation type
  - Ensure all error messages are in Portuguese
  - Add loading states during submission
  - Test with various PIX key formats
- **Implementation Example**:
  ```typescript
  const validatePixKey = (key: string): { valid: boolean; message?: string } => {
    if (!key) return { valid: false, message: 'Chave PIX é obrigatória' };

    // Remove formatting
    const cleanKey = key.replace(/[^a-zA-Z0-9@+.-]/g, '');

    // Check different PIX key types
    if (/^\d{11}$/.test(cleanKey)) {
      return { valid: true }; // CPF
    }
    if (/^\d{14}$/.test(cleanKey)) {
      return { valid: true }; // CNPJ
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanKey)) {
      return { valid: true }; // Email
    }
    if (/^\+?[1-9]\d{10,14}$/.test(cleanKey)) {
      return { valid: true }; // Phone
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanKey)) {
      return { valid: true }; // Random key
    }

    return { valid: false, message: 'Formato de chave PIX inválido' };
  };
  ```
- **Success Criteria**: Frontend properly validates and submits PIX keys

#### Task 7: Backend Fix Implementation
- **Assigned to**: backend-engineer
- **Dependencies**: Tasks 4, 5
- **Priority**: CRITICAL
- **Deliverables**:
  - Fix validation in profile/wallet update endpoint
  - Implement comprehensive PIX key validation
  - Add proper error messages in Portuguese
  - Ensure encryption if required
  - Add logging for debugging
  - Handle edge cases
- **Implementation Example**:
  ```typescript
  @Patch('wallet')
  async updateWallet(@Body() dto: UpdateWalletDto, @Req() req) {
    try {
      // Validate PIX key format
      if (dto.pixKey) {
        const isValid = this.validatePixKeyFormat(dto.pixKey);
        if (!isValid) {
          throw new BadRequestException('Formato de chave PIX inválido');
        }

        // Encrypt if needed
        if (this.shouldEncrypt) {
          dto.pixKey = await this.encryptionUtil.encrypt(dto.pixKey);
        }
      }

      // Update user
      const updated = await this.userService.updateWallet(req.user.id, dto);

      return {
        success: true,
        message: 'Carteira atualizada com sucesso',
        data: updated
      };
    } catch (error) {
      this.logger.error('Wallet update failed:', error);
      throw new BadRequestException(
        error.message || 'Falha ao atualizar carteira'
      );
    }
  }
  ```
- **Success Criteria**: Backend properly validates and stores PIX keys

### PHASE 5: Testing and Verification (75-90 minutes)

#### Task 8: End-to-End Testing
- **Assigned to**: test-writer-fixer
- **Dependencies**: Tasks 6-7 complete
- **Priority**: HIGH
- **Deliverables**:
  - Test all PIX key formats:
    - CPF: 12345678901
    - CNPJ: 12345678000195
    - Email: user@example.com
    - Phone: +5511999999999
    - Random: 123e4567-e89b-12d3-a456-426614174000
  - Test invalid formats and verify error messages
  - Test empty submission
  - Test special characters handling
  - Verify data persistence in database
  - Check if PIX key is displayed correctly after save
- **Test Scenarios**:
  1. Valid CPF format
  2. Valid CNPJ format
  3. Valid email format
  4. Valid phone format
  5. Valid random key format
  6. Invalid formats (partial CPF, invalid email, etc.)
  7. Empty field submission
  8. Update existing PIX key
- **Success Criteria**: All valid formats accepted, clear errors for invalid formats

#### Task 9: UI/UX Improvements
- **Assigned to**: frontend-developer
- **Dependencies**: Task 8
- **Priority**: MEDIUM
- **Deliverables**:
  - Add format hints/placeholders
  - Show PIX key type detection in real-time
  - Add copy-to-clipboard for saved PIX key
  - Improve error message display
  - Add success feedback after save
- **UI Improvements**:
  ```tsx
  <div className="space-y-2">
    <Label>Chave PIX</Label>
    <Input
      placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
      value={pixKey}
      onChange={handlePixKeyChange}
    />
    {pixKeyType && (
      <p className="text-sm text-muted-foreground">
        Tipo detectado: {pixKeyType}
      </p>
    )}
    {error && (
      <p className="text-sm text-red-500">{error}</p>
    )}
  </div>
  ```
- **Success Criteria**: Improved user experience with clear guidance

## Technical Specifications

### PIX Key Format Requirements
1. **CPF**: 11 digits (can include formatting: 123.456.789-01)
2. **CNPJ**: 14 digits (can include formatting: 12.345.678/0001-95)
3. **Email**: Valid email format
4. **Phone**: Brazilian format with country code (+5511999999999)
5. **Random Key**: UUID v4 format

### Error Messages (Portuguese)
- "Chave PIX é obrigatória"
- "Formato de chave PIX inválido"
- "CPF inválido"
- "CNPJ inválido"
- "Email inválido"
- "Telefone inválido"
- "Chave aleatória inválida"
- "Falha ao salvar chave PIX"

## Expected Solution
The issue is likely one of:
1. Frontend validation too strict or incorrect regex
2. Backend validation not accepting valid formats
3. Missing or incorrect field mapping in API request
4. Database constraint preventing storage
5. Encryption requirement not being met

## Success Criteria
- ✅ Users can add all valid PIX key formats
- ✅ Clear error messages for invalid formats
- ✅ PIX keys are properly stored in database
- ✅ PIX keys are displayed correctly after save
- ✅ All messages in Portuguese
- ✅ No regression in other settings functionality

## Execution Timeline
1. **Phase 1 (0-15 min)**: Initial investigation
2. **Phase 2 (15-30 min)**: Deep analysis
3. **Phase 3 (30-45 min)**: Database verification
4. **Phase 4 (45-75 min)**: Fix implementation
5. **Phase 5 (75-90 min)**: Testing and verification

## Agent Delegation Strategy
1. **bug-fixer**: Initial investigation and root cause analysis
2. **backend-architect**: Backend API and validation review
3. **frontend-developer**: Frontend form and validation fixes
4. **backend-engineer**: Backend implementation fixes
5. **database-optimizer**: Schema verification and queries
6. **test-writer-fixer**: End-to-end testing and verification
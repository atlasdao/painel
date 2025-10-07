-- Create or update admin user with proper validation
INSERT INTO "User" (
    id,
    email,
    username,
    password,
    "isAccountValidated",
    "validationPaymentId",
    "validatedAt",
    "verifiedTaxNumber",
    "botExternalId",
    "externalUserId",
    "createdAt",
    "updatedAt"
) VALUES (
    'admin-user-id-001',
    'admin@atlas.local',
    'admin',
    '$2b$10$dummyhashedpasswordfordev',
    true,
    'ADMIN_PAY_' || EXTRACT(epoch FROM NOW()),
    NOW(),
    'EU016854595427927',
    'EU016854595427927',
    'EU016854595427927',
    NOW(),
    NOW()
) ON CONFLICT (username) DO UPDATE SET
    "isAccountValidated" = true,
    "validationPaymentId" = 'ADMIN_PAY_' || EXTRACT(epoch FROM NOW()),
    "validatedAt" = NOW(),
    "verifiedTaxNumber" = 'EU016854595427927',
    "botExternalId" = 'EU016854595427927',
    "externalUserId" = 'EU016854595427927',
    "updatedAt" = NOW();
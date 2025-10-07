-- First, check if admin user exists and create if not
INSERT INTO "User" (
    telegram_user_id,
    telegram_username,
    is_verified,
    verification_status,
    external_id,
    verified_at,
    verification_payment_id,
    verification_depix_txid,
    payer_name,
    payer_cpf_cnpj,
    created_at,
    updated_at
) VALUES (
    100000001,
    'admin',
    true,
    'verified',
    'EU016854595427927',
    NOW(),
    'ADMIN_PAY_' || EXTRACT(epoch FROM NOW()) || random(),
    'EU016854595427927',
    'Admin User',
    '000.000.000-00',
    NOW(),
    NOW()
) ON CONFLICT (telegram_user_id) DO UPDATE SET
    telegram_username = 'admin',
    is_verified = true,
    verification_status = 'verified',
    external_id = 'EU016854595427927',
    verified_at = NOW(),
    verification_payment_id = 'ADMIN_PAY_' || EXTRACT(epoch FROM NOW()) || random(),
    verification_depix_txid = 'EU016854595427927',
    payer_name = 'Admin User',
    payer_cpf_cnpj = '000.000.000-00',
    updated_at = NOW();

-- Also create verification transaction record
INSERT INTO "VerificationTransaction" (
    user_id,
    status,
    payment_id,
    depix_txid,
    amount,
    currency,
    created_at,
    updated_at
) VALUES (
    100000001,
    'completed',
    'ADMIN_PAY_' || EXTRACT(epoch FROM NOW()) || random(),
    'EU016854595427927',
    10.00,
    'BRL',
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    status = 'completed',
    payment_id = 'ADMIN_PAY_' || EXTRACT(epoch FROM NOW()) || random(),
    depix_txid = 'EU016854595427927',
    updated_at = NOW();
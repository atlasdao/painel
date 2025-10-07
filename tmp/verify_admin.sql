SELECT
    telegram_user_id,
    telegram_username,
    is_verified,
    verification_status,
    external_id,
    verified_at,
    verification_payment_id,
    verification_depix_txid,
    payer_name,
    payer_cpf_cnpj
FROM "User"
WHERE telegram_username = 'admin';
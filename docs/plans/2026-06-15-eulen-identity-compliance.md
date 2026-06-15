# Eulen identity compliance plan

Date: 2026-06-15
Branch: `issue-38-46-59-eulen-identity`
Issues: zapix-labs/zapix-web-rebrand#38, #46, #59

## Context

The active implementation repo is `C:\Users\User\Documents\Zapix\Zapix_Web_Project\painel`, remote `atlasdao/painel`.
The product issues live in `zapix-labs/zapix-web-rebrand`.

Relevant current behavior:

- `Atlas-API/src/services/eulen-client.service.ts` wraps Eulen calls with a simple per-endpoint rate limiter, but has no provider-driven backoff/circuit breaker for `520 Too many requests`.
- `Atlas-API/src/withdrawals/withdrawals.service.ts` polls Eulen withdrawals every minute and has no persisted `nextPollAt`.
- `Atlas-API/src/services/transaction-status-sync.service.ts` polls pending deposit status every minute and only uses a fixed 500 ms delay between transactions.
- `Atlas-API/src/services/eulen-client.service.ts` only sends `endUserTaxNumber` when the value has 11 or 14 digits, so an EUID cannot be sent as `euid`.
- `Atlas-API/src/pix/pix.service.ts` uses `verifiedTaxNumber` as if it were payer identity and sends it via `userTaxNumber`; for merchant QR this should become `merchantId`.
- Payment link public generation only requires CPF/CNPJ above the old R$ 3000 threshold.
- No Identity Vault / merchant contact model exists in Prisma today.

## Goal

Make Eulen webhook/status/polling reliable first, then implement merchant-scoped payer identities/contacts and QR generation with required payer identification plus merchant attribution.

## Non-goals

- Do not collect EUID manually from merchants or payers.
- Do not implement a full CRM/contact CRUD beyond search/upsert needed for QR/payment-link flows.
- Do not redesign withdrawal product UX; only implement the reliability controls required by #38.
- Do not expose a global payer directory to merchants.

## Assumptions

- `User.verifiedTaxNumber` currently stores the validated Eulen EUID after onboarding; the new implementation will treat it as merchant EUID where it matches EUID shape.
- Eulen deposit accepts `euid`, `endUserTaxNumber`, `endUserFullName`, `merchantId`, `whitelist`, and `delayDepixInHours`.
- Payer full CPF/CNPJ may be stored only as a keyed hash plus masked version in the Identity Vault/contact tables; existing `Transaction.payerTaxNumber` and `PaymentLinkSession.payerTaxNumber` remain compatibility fields and will not be exposed in contact search.
- The branch is now in Scene 1 implementation. Files in Scene 1 scope may be dirty because this plan is a live execution artifact, not a pristine pre-implementation snapshot.
- The user explicitly requested one PR. Commit, push, and PR creation are authorized for the main thread after final verification; subagents remain read-only/review-only unless given a bounded write scope and must not push or publish.

## PII and redaction contract

- New identity/contact persistence stores payer CPF/CNPJ as `taxNumberHash` plus `taxNumberMasked`; full payer document is accepted only as request input and compatibility session metadata while the QR is generated.
- Contact search responses must return `id`, `displayName`, `taxNumberMasked`, `lastSuccessfulPaymentAt`, `status`, and optional `payerEuid` only for backend QR payload assembly. The UI must never show full CPF/CNPJ.
- Logs and audit payloads touched by this PR must redact `taxNumber`, `payerTaxNumber`, `payerCpfCnpj`, `endUserTaxNumber`, `euid`, `payerEUID`, `merchantId`, and nested payer payloads.
- Existing historical raw metadata/audit rows are out of this PR and should be handled by a separate retention/scrub task if required.

## API contract additions

Payment link public request:

- `POST /pay/:shortCode/validate-tax-number`
- Body: `{ taxNumber: string, amount?: number, fullName?: string }`
- Response extension: `{ needsFullName?: boolean, contactFound?: boolean, payerNameHint?: string, qrCode?: string, transactionId?: string, sessionToken?: string }`
- Compatibility: old clients that send only `taxNumber` receive `needsFullName: true` instead of generating an unidentified QR when no merchant contact exists.

Manual QR authenticated request:

- Existing payload gains `payerContactId?: string`, `payerTaxNumber?: string`, `payerFullName?: string`.
- Existing `payerCpfCnpj` is accepted as a backwards-compatible alias for `payerTaxNumber`.
- No request accepts `payerEuid` from the browser.

Identity contacts:

- `GET /identity-vault/contacts/search?q=<name-or-doc-fragment>`
- Authenticated and merchant-scoped by effective user id.
- Response exposes only masked documents.

Eulen deposit payload:

- Saved contact with EUID: send `{ euid, merchantId }`.
- New payer: send `{ endUserTaxNumber, endUserFullName, merchantId }`.
- Never send an EUID as `endUserTaxNumber`.

## Migration files

- Scene 1 withdrawal polling: `Atlas-API/prisma/migrations/20260615_add_eulen_withdrawal_polling.sql`
- Scene 2 identity vault: `Atlas-API/prisma/migrations/20260615_add_identity_vault.sql`
- Rollback SQL if needed: additive rollback snippets go in `docs/plans/2026-06-15-eulen-identity-compliance.md` under final notes unless the repo already has a matching rollback convention for that migration area.

## Scene Roadmap

### Scene 1: #38 Eulen reliability

Write scope:

- `Atlas-API/src/services/rate-limiter.service.ts`
- `Atlas-API/src/services/eulen-client.service.ts`
- `Atlas-API/src/services/transaction-status-sync.service.ts`
- `Atlas-API/src/withdrawals/withdrawals.service.ts`
- `Atlas-API/prisma/schema.prisma`
- migration SQL for withdrawal polling fields
- focused service tests

Objective:

- Add provider-driven rate-limit detection, retry-after parsing, exponential backoff, jitter, circuit breaker by endpoint, observable rate-limit events, and persisted withdrawal `nextPollAt`.
- Env/config defaults:
  - `EULEN_RATE_LIMIT_DEFAULT_RETRY_MS` default `60000`.
  - `EULEN_RATE_LIMIT_MAX_RETRY_MS` default `900000`.

Checks:

- Focused Jest tests for Eulen rate-limit/backoff and withdrawal polling skip.
- `npm run build` in `Atlas-API`.

Stop conditions:

- Backoff sleeps cannot make unit tests slow.
- Circuit breaker must not convert business errors into retries.

### Scene 2: #46 Identity Vault backend

Write scope:

- `Atlas-API/prisma/schema.prisma`
- migration SQL for identity/contact tables
- `Atlas-API/src/identity-vault/**`
- module imports
- backend tests

Objective:

- Add internal payer identity and merchant-scoped contact records with hashed CPF/CNPJ, masked document, EUID, canonical/search names, per-merchant search, and webhook/status upsert helpers.
- Add transaction identity references and match status when needed for expected-vs-actual payer comparison.

Checks:

- Unit tests for tax hash/mask/search scope/mismatch comparison.
- Prisma validation or build.

Stop conditions:

- Any endpoint that allows cross-merchant contact search.
- Any response exposing full CPF/CNPJ.

### Scene 3: #59 QR/payment flows

Write scope:

- `Atlas-API/src/services/eulen-client.service.ts`
- `Atlas-API/src/pix/**`
- `Atlas-API/src/payment-link/**`
- `Atlas-API/src/account-validation/**`
- `Atlas-API/src/webhooks/**`
- focused backend tests

Objective:

- Extend QR contracts with `payerTaxNumber`, `payerFullName`, `payerEuid`, `merchantId`, `identitySource`, and Eulen payload builder behavior:
  - saved payer contact sends `euid`;
  - new payer sends `endUserTaxNumber + endUserFullName`;
  - merchant QR sends `merchantId` from stored merchant EUID.
- Payment link always collects payer CPF/CNPJ before QR; asks for full name only when contact lookup cannot resolve it.
- Webhook/status upserts contact only when payer identity matches expected EUID or tax document comparison.

Checks:

- Unit tests for Eulen payload builder.
- Integration-style service tests for payment link needs-name and contact reuse paths.

Stop conditions:

- Manual EUID input.
- QR generated for merchant without payer identity.
- EUID sent as `endUserTaxNumber`.

### Scene 4: Frontend flows

Write scope:

- `Atlas-Panel/app/components/QRCodeGenerator.tsx`
- `Atlas-Panel/app/pay/[shortCode]/PaymentClient.tsx`
- `Atlas-Panel/app/components/AccountValidationModal.tsx`
- `Atlas-Panel/app/lib/services.ts`
- frontend build fixes

Objective:

- Add contact suggestions by name/CPF for manual QR.
- Add full-name prompt in payment links only when backend returns `needsFullName`.
- Add onboarding CPF/CNPJ/name fields where validation payment is created.

Checks:

- `npm run build` in `Atlas-Panel`.
- Browser smoke on the affected screens if the app can start locally without external services.

Stop conditions:

- UI asks for EUID.
- Suggestions show full CPF/CNPJ.

### Scene 5: Final verification and PR

Write scope:

- tests only if final reviewers find gaps
- PR body

Objective:

- Run focused and broad checks, review git hygiene, commit, push branch, and open one PR with exact summary and CI/pre-merge test recommendations.

Checks:

- `git diff --check`
- backend focused Jest
- backend build
- frontend build
- final reviewer/sweeper gates

Rollback strategy:

- Schema changes are additive.
- Eulen backoff/circuit parameters are env-configurable.
- QR identity enforcement can degrade to collecting CPF/CNPJ + full name when contact/EUID is unavailable.

Rollback SQL snippets:

- Scene 1:
  - `DROP INDEX IF EXISTS "WithdrawalRequest_eulenNextPollAt_idx";`
  - `ALTER TABLE "WithdrawalRequest" DROP COLUMN IF EXISTS "eulenNextPollAt", DROP COLUMN IF EXISTS "eulenPollAttempts", DROP COLUMN IF EXISTS "eulenRateLimitedAt";`
- Scene 2:
  - Drop new Identity Vault FKs/indexes/tables only after disabling dual-write paths.

## Status log

- 2026-06-15: CMV loaded and MAPO selected.
- 2026-06-15: Clean branch created from `main`.
- 2026-06-15: Issues #38, #46, #59 verified open in GitHub.
- 2026-06-15: Plan Gate rejected initial plan; plan updated with live dirty state, exact API additions, migration files, PII redaction scope, env defaults, and main-thread PR authorization.

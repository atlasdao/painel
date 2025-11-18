-- Add IN_REVIEW status to TransactionStatus enum
-- This must be done in a separate transaction from any usage
ALTER TYPE "TransactionStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';

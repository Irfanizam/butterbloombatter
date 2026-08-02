-- Manual ledger position for the merged finance ledger (higher = nearer the top).
ALTER TABLE "Order" ADD COLUMN "ledgerOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Finance" ADD COLUMN "ledgerOrder" INTEGER NOT NULL DEFAULT 0;

-- Remove stock tracking entirely (pre-order business, stock not used).
ALTER TABLE "Product" DROP COLUMN "stock";

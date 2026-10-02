-- Allergens per product (keys from src/lib/allergens.ts), shown on the storefront.
ALTER TABLE "Product" ADD COLUMN "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Manual menu order for products (admin drag-reorder; the storefront menu follows it).
ALTER TABLE "Product" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Start from today's order (newest first) so nothing moves until the admin reorders.
UPDATE "Product" AS p
SET "sortOrder" = ranked.position
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" DESC) - 1 AS position
  FROM "Product"
) AS ranked
WHERE p.id = ranked.id;

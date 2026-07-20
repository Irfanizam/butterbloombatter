-- Rename OrderStatus value READY -> PACKED (preserves existing rows)
ALTER TYPE "OrderStatus" RENAME VALUE 'READY' TO 'PACKED';

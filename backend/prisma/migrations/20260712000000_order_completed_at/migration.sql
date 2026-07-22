-- Add completion timestamp for orders (set when status becomes DELIVERED)
ALTER TABLE "Order" ADD COLUMN "completedAt" TIMESTAMP(3);

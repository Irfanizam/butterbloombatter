-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "joinedDate" TIMESTAMP(3),
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Finance" ADD COLUMN     "customerId" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "tag" TEXT;

-- AddForeignKey
ALTER TABLE "Finance" ADD CONSTRAINT "Finance_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

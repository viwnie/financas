-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "excludedDates" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[];

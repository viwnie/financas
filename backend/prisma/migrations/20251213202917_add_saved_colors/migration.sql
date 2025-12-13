-- AlterTable
ALTER TABLE "User" ADD COLUMN     "savedColors" TEXT[] DEFAULT ARRAY[]::TEXT[];

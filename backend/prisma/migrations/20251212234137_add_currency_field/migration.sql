/*
  Warnings:

  - You are about to drop the column `name` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `name_en` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `name_es` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `name_pt` on the `Category` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('BRL', 'USD', 'EUR', 'BTC', 'ETH', 'SOL', 'USDT', 'USDC');

-- DropIndex
DROP INDEX "Category_name_en_idx";

-- DropIndex
DROP INDEX "Category_name_es_idx";

-- DropIndex
DROP INDEX "Category_name_pt_idx";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "name",
DROP COLUMN "name_en",
DROP COLUMN "name_es",
DROP COLUMN "name_pt";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'BRL';

-- CreateTable
CREATE TABLE "CategoryTranslation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryTranslation_name_idx" ON "CategoryTranslation"("name");

-- CreateIndex
CREATE INDEX "CategoryTranslation_language_idx" ON "CategoryTranslation"("language");

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

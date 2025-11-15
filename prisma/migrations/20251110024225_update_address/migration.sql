/*
  Warnings:

  - You are about to drop the column `district` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `province` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `street` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `ward` on the `addresses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."addresses" DROP COLUMN "district",
DROP COLUMN "province",
DROP COLUMN "street",
DROP COLUMN "ward",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "line1" TEXT,
ADD COLUMN     "line2" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "state" TEXT,
ALTER COLUMN "recipient" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;

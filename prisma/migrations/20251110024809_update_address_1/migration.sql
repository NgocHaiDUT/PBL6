/*
  Warnings:

  - You are about to drop the column `city` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `line1` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `line2` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `postal_code` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `addresses` table. All the data in the column will be lost.
  - Added the required column `district` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `province` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `street` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ward` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Made the column `recipient` on table `addresses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `addresses` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."addresses" DROP COLUMN "city",
DROP COLUMN "country",
DROP COLUMN "line1",
DROP COLUMN "line2",
DROP COLUMN "postal_code",
DROP COLUMN "state",
ADD COLUMN     "district" TEXT NOT NULL,
ADD COLUMN     "province" TEXT NOT NULL,
ADD COLUMN     "street" TEXT NOT NULL,
ADD COLUMN     "ward" TEXT NOT NULL,
ALTER COLUMN "recipient" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;

/*
  Warnings:

  - A unique constraint covering the columns `[owner_id]` on the table `shops` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."shops" ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "shops_owner_id_key" ON "public"."shops"("owner_id");

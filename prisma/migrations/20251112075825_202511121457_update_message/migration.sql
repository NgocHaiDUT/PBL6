/*
  Warnings:

  - You are about to drop the column `message_type` on the `messages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."messages" DROP COLUMN "message_type";

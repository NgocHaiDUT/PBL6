-- CreateEnum
CREATE TYPE "public"."message_type" AS ENUM ('TEXT', 'SHARE_POST', 'SHARE_PRODUCT');

-- AlterTable
ALTER TABLE "public"."messages" ADD COLUMN     "payload" JSONB,
ADD COLUMN     "type" "public"."message_type" NOT NULL DEFAULT 'TEXT';

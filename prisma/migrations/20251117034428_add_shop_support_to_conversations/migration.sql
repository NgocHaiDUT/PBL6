/*
  Warnings:

  - The primary key for the `conversation_participants` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[conversation_id,user_id]` on the table `conversation_participants` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[conversation_id,shop_id]` on the table `conversation_participants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `entity_type` to the `conversation_participants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender_type` to the `messages` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."conversation_participants" DROP CONSTRAINT "conversation_participants_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."conversation_participants" DROP CONSTRAINT "conversation_participants_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."messages" DROP CONSTRAINT "messages_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."messages" DROP CONSTRAINT "messages_sender_id_fkey";

-- AlterTable
ALTER TABLE "public"."conversation_participants" DROP CONSTRAINT "conversation_participants_pkey",
ADD COLUMN     "entity_type" TEXT NOT NULL,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "shop_id" INTEGER,
ALTER COLUMN "user_id" DROP NOT NULL,
ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."messages" ADD COLUMN     "sender_shop_id" INTEGER,
ADD COLUMN     "sender_type" TEXT NOT NULL,
ALTER COLUMN "sender_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "conversation_participants_user_id_idx" ON "public"."conversation_participants"("user_id");

-- CreateIndex
CREATE INDEX "conversation_participants_shop_id_idx" ON "public"."conversation_participants"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversation_id_user_id_key" ON "public"."conversation_participants"("conversation_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversation_id_shop_id_key" ON "public"."conversation_participants"("conversation_id", "shop_id");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "public"."messages"("sender_id");

-- CreateIndex
CREATE INDEX "messages_sender_shop_id_idx" ON "public"."messages"("sender_shop_id");

-- AddForeignKey
ALTER TABLE "public"."conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversation_participants" ADD CONSTRAINT "conversation_participants_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_sender_shop_id_fkey" FOREIGN KEY ("sender_shop_id") REFERENCES "public"."shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

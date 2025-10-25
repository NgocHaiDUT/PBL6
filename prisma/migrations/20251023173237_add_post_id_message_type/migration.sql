/*
  Warnings:

  - You are about to drop the column `cover_url` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `video_url` on the `posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."messages" ADD COLUMN     "message_type" TEXT,
ADD COLUMN     "post_id" INTEGER;

-- AlterTable
ALTER TABLE "public"."posts" DROP COLUMN "cover_url",
DROP COLUMN "video_url";

/*
  Warnings:

  - A unique constraint covering the columns `[ghn_order_code]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ghn_shop_id]` on the table `shops` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."message_type" ADD VALUE 'IMAGE';
ALTER TYPE "public"."message_type" ADD VALUE 'VIDEO';

-- AlterTable
ALTER TABLE "public"."addresses" ADD COLUMN     "ghn_district_id" INTEGER,
ADD COLUMN     "ghn_province_id" INTEGER,
ADD COLUMN     "ghn_ward_code" TEXT;

-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "ghn_expected_delivery_time" TIMESTAMP(3),
ADD COLUMN     "ghn_order_code" TEXT,
ADD COLUMN     "ghn_required_note" TEXT,
ADD COLUMN     "shipping_payer" TEXT;

-- AlterTable
ALTER TABLE "public"."product_variants" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "length" INTEGER,
ADD COLUMN     "weight" INTEGER,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "public"."shop_addresses" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ghn_district_id" INTEGER,
ADD COLUMN     "ghn_province_id" INTEGER,
ADD COLUMN     "ghn_ward_code" TEXT;

-- AlterTable
ALTER TABLE "public"."shops" ADD COLUMN     "ghn_shop_id" INTEGER;

-- CreateTable
CREATE TABLE "public"."shipment_logs" (
    "id" SERIAL NOT NULL,
    "shipment_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "location_description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipment_logs_shipment_id_status_updated_at_key" ON "public"."shipment_logs"("shipment_id", "status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_ghn_order_code_key" ON "public"."orders"("ghn_order_code");

-- CreateIndex
CREATE UNIQUE INDEX "shops_ghn_shop_id_key" ON "public"."shops"("ghn_shop_id");

-- AddForeignKey
ALTER TABLE "public"."shipment_logs" ADD CONSTRAINT "shipment_logs_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

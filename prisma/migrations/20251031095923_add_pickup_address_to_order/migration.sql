-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "pickup_address_id" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_pickup_address_id_fkey" FOREIGN KEY ("pickup_address_id") REFERENCES "public"."shop_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

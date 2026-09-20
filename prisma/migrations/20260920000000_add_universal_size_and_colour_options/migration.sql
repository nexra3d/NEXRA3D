-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "hasSizes" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "hasColours" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "size" TEXT;

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "selectedSize" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "selectedSize" TEXT;

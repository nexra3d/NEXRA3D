import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

try {
  const devEnvPath = path.resolve('/app/.dev.env.json');
  if (fs.existsSync(devEnvPath)) {
    const raw = JSON.parse(fs.readFileSync(devEnvPath, 'utf8'));
    for (const [k, v] of Object.entries(raw)) {
      if (!process.env[k] && typeof v === 'string') {
        process.env[k] = v;
      }
    }
  }
} catch (_) {}

import { PrismaClient } from '@prisma/client';
import { memoryStore } from './memoryDb.js';
import { supabaseAdmin, isSupabaseConfigured } from './supabase.js';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_SERVICES } from '../data/mockData.js';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const dbUrl = (
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.SUPABASE_DB_URL ||
  ''
).trim();

const isPlaceholderDbUrl =
  !dbUrl ||
  dbUrl.includes('user:password') ||
  dbUrl.startsWith('file:') ||
  dbUrl.includes('sample');

const hasDatabaseUrl = !isPlaceholderDbUrl;

if (hasDatabaseUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = dbUrl;
}

let rawPrisma: any;
try {
  rawPrisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      datasources: hasDatabaseUrl ? { db: { url: dbUrl } } : undefined,
      log: ['error'],
    });
} catch (e) {
  console.warn('[AI Studio] PrismaClient initialization warning:', e);
  rawPrisma = {};
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = rawPrisma;
}

let dbSchemaEnsured = false;

export async function ensureDbSchema(): Promise<void> {
  if (!hasDatabaseUrl) {
    return;
  }
  if (dbSchemaEnsured) return;

  try {
    // 1. Create custom_orders table if not exists
    await rawPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "custom_orders" (
        "id" TEXT NOT NULL,
        "customerName" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "email" TEXT,
        "description" TEXT,
        "customOrderName" TEXT,
        "imageUrl" TEXT,
        "isPublic" BOOLEAN NOT NULL DEFAULT false,
        "amount" DECIMAL(10,2) NOT NULL,
        "deliveryType" TEXT NOT NULL DEFAULT 'STORE_PICKUP',
        "notes" TEXT,
        "paymentStatus" TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
        "razorpayOrderId" TEXT,
        "razorpayQrId" TEXT,
        "qrImageUrl" TEXT,
        "paymentLink" TEXT,
        "isSimulated" BOOLEAN NOT NULL DEFAULT false,
        "expiresAt" TIMESTAMP(3),
        "paidAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "custom_orders_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});

    // 2. Create custom_order_reviews table if not exists
    await rawPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "custom_order_reviews" (
        "id" TEXT NOT NULL,
        "customOrderId" TEXT NOT NULL,
        "userId" TEXT,
        "userName" TEXT,
        "rating" INTEGER NOT NULL DEFAULT 5,
        "title" TEXT,
        "comment" TEXT NOT NULL,
        "isApproved" BOOLEAN NOT NULL DEFAULT true,
        "status" TEXT NOT NULL DEFAULT 'APPROVED',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "custom_order_reviews_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});

    // Drop restrictive foreign key constraint if it exists so general reviews work smoothly
    try {
      await rawPrisma.$executeRawUnsafe(`
        ALTER TABLE "custom_order_reviews" DROP CONSTRAINT IF EXISTS "custom_order_reviews_customOrderId_fkey";
      `);
    } catch (_) {}

    // Ensure general custom_order exists for any legacy foreign key requirements
    try {
      await rawPrisma.$executeRawUnsafe(`
        INSERT INTO "custom_orders" ("id", "customerName", "phone", "amount", "description", "customOrderName", "isPublic")
        VALUES ('general', 'General NEXRA 3D Order', '0000000000', 0, 'General Order Review Target', 'General Review', false)
        ON CONFLICT ("id") DO NOTHING;
      `);
    } catch (_) {}

    // 3. Create categories table if not exists
    await rawPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "description" TEXT,
        "imageUrl" TEXT,
        "image_url" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "parentId" TEXT,
        "parent_id" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});
    await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_key" ON "categories"("slug");`).catch(() => {});

    // 4. Create products table if not exists
    await rawPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "sku" TEXT NOT NULL,
        "shortDescription" TEXT,
        "short_description" TEXT,
        "description" TEXT,
        "price" DECIMAL(10,2) NOT NULL,
        "mrp" DECIMAL(10,2),
        "discountPercentage" DECIMAL(5,2) DEFAULT 0,
        "discount_percentage" DECIMAL(5,2) DEFAULT 0,
        "taxPercentage" DECIMAL(5,2) DEFAULT 0,
        "tax_percentage" DECIMAL(5,2) DEFAULT 0,
        "stockQuantity" INTEGER NOT NULL DEFAULT 10,
        "stock_quantity" INTEGER NOT NULL DEFAULT 10,
        "lowStockThreshold" INTEGER DEFAULT 5,
        "low_stock_threshold" INTEGER DEFAULT 5,
        "weight" DECIMAL(8,2),
        "length" DECIMAL(8,2),
        "width" DECIMAL(8,2),
        "height" DECIMAL(8,2),
        "specifications" JSONB,
        "imageUrl" TEXT,
        "image_url" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "isFeatured" BOOLEAN NOT NULL DEFAULT false,
        "is_featured" BOOLEAN NOT NULL DEFAULT false,
        "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
        "is_new_arrival" BOOLEAN NOT NULL DEFAULT false,
        "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
        "is_best_seller" BOOLEAN NOT NULL DEFAULT false,
        "seoTitle" TEXT,
        "seo_title" TEXT,
        "seoDescription" TEXT,
        "seo_description" TEXT,
        "metaDescription" TEXT,
        "meta_description" TEXT,
        "categoryId" TEXT,
        "category_id" TEXT,
        "requiresCustomization" BOOLEAN NOT NULL DEFAULT false,
        "requires_customization" BOOLEAN NOT NULL DEFAULT false,
        "requiresImageUpload" BOOLEAN NOT NULL DEFAULT false,
        "requires_image_upload" BOOLEAN NOT NULL DEFAULT false,
        "minimumImageUploads" INTEGER DEFAULT 1,
        "minimum_image_uploads" INTEGER DEFAULT 1,
        "maximumImageUploads" INTEGER DEFAULT 5,
        "maximum_image_uploads" INTEGER DEFAULT 5,
        "hasSizes" BOOLEAN NOT NULL DEFAULT false,
        "has_sizes" BOOLEAN NOT NULL DEFAULT false,
        "hasColours" BOOLEAN NOT NULL DEFAULT false,
        "has_colours" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "products_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});
    await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "products_slug_key" ON "products"("slug");`).catch(() => {});
    await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_key" ON "products"("sku");`).catch(() => {});

    // 5. Create product_images table if not exists
    await rawPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "product_images" (
        "id" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "product_id" TEXT,
        "url" TEXT NOT NULL,
        "publicId" TEXT,
        "public_id" TEXT,
        "altText" TEXT,
        "alt_text" TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "isPrimary" BOOLEAN NOT NULL DEFAULT false,
        "is_primary" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});

    // 6. Create product_variants table if not exists
    await rawPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "product_variants" (
        "id" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "product_id" TEXT,
        "sku" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "price" DECIMAL(10,2) NOT NULL,
        "mrp" DECIMAL(10,2),
        "stockQuantity" INTEGER NOT NULL DEFAULT 10,
        "stock_quantity" INTEGER NOT NULL DEFAULT 10,
        "size" TEXT,
        "colour" TEXT,
        "wattage" TEXT,
        "attributes" JSONB,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});

    // 7. Create product_lamp_options table if not exists
    await rawPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "product_lamp_options" (
        "id" TEXT NOT NULL,
        "productId" TEXT,
        "product_id" TEXT,
        "optionType" TEXT,
        "option_type" TEXT,
        "optionValue" TEXT,
        "option_value" TEXT,
        "priceDelta" DECIMAL(10,2) DEFAULT 0,
        "price_delta" DECIMAL(10,2) DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "product_lamp_options_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});

    // 8. Create orders table if not exists
    await rawPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" TEXT NOT NULL,
        "orderNumber" TEXT NOT NULL,
        "order_number" TEXT,
        "userId" TEXT,
        "user_id" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
        "payment_status" TEXT,
        "paymentMethod" TEXT NOT NULL DEFAULT 'ONLINE',
        "payment_method" TEXT,
        "razorpayOrderId" TEXT,
        "razorpay_order_id" TEXT,
        "razorpayPaymentId" TEXT,
        "razorpay_payment_id" TEXT,
        "razorpaySignature" TEXT,
        "razorpay_signature" TEXT,
        "totalAmount" DECIMAL(10,2) NOT NULL,
        "total_amount" DECIMAL(10,2),
        "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "taxAmount" DECIMAL(10,2) DEFAULT 0,
        "tax_amount" DECIMAL(10,2),
        "shippingFee" DECIMAL(10,2) DEFAULT 0,
        "shipping_fee" DECIMAL(10,2),
        "discountAmount" DECIMAL(10,2) DEFAULT 0,
        "discount_amount" DECIMAL(10,2),
        "couponCode" TEXT,
        "coupon_code" TEXT,
        "couponId" TEXT,
        "coupon_id" TEXT,
        "shippingAddress" JSONB,
        "shipping_address" JSONB,
        "billingAddress" JSONB,
        "billing_address" JSONB,
        "shippingProvider" TEXT,
        "shipping_provider" TEXT,
        "awbNumber" TEXT,
        "awb_number" TEXT,
        "trackingNumber" TEXT,
        "tracking_number" TEXT,
        "shipmentId" TEXT,
        "shipment_id" TEXT,
        "estimatedDelivery" TIMESTAMP(3),
        "estimated_delivery" TIMESTAMP(3),
        "shipmentStatus" TEXT,
        "shipment_status" TEXT,
        "pickupRequested" BOOLEAN DEFAULT false,
        "pickup_requested" BOOLEAN DEFAULT false,
        "labelUrl" TEXT,
        "label_url" TEXT,
        "trackingUrl" TEXT,
        "tracking_url" TEXT,
        "manifestUrl" TEXT,
        "manifest_url" TEXT,
        "lastTrackingUpdate" TIMESTAMP(3),
        "last_tracking_update" TIMESTAMP(3),
        "trackingHistory" JSONB,
        "tracking_history" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});
    await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "orders_orderNumber_key" ON "orders"("orderNumber");`).catch(() => {});

    // 9. Create order_items table if not exists
    await rawPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "order_items" (
        "id" TEXT NOT NULL,
        "orderId" TEXT NOT NULL,
        "order_id" TEXT,
        "productId" TEXT,
        "product_id" TEXT,
        "variantId" TEXT,
        "variant_id" TEXT,
        "productTitle" TEXT,
        "product_title" TEXT,
        "skuSnapshot" TEXT,
        "sku_snapshot" TEXT,
        "selectedSize" TEXT,
        "selected_size" TEXT,
        "selectedColour" TEXT,
        "selected_colour" TEXT,
        "selectedWattage" TEXT,
        "selected_wattage" TEXT,
        "customizationText" TEXT,
        "customization_text" TEXT,
        "price" DECIMAL(10,2) NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "subtotal" DECIMAL(10,2),
        "total" DECIMAL(10,2),
        "imageUrl" TEXT,
        "image_url" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});

    // 10. Create users and addresses tables if not exists
    await rawPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        "email_verified" BOOLEAN NOT NULL DEFAULT false,
        "phone" TEXT,
        "company" TEXT,
        "gst" TEXT,
        "avatar" TEXT,
        "marketingOptIn" BOOLEAN NOT NULL DEFAULT true,
        "analyticsOptIn" BOOLEAN NOT NULL DEFAULT true,
        "isAnonymized" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});
    await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");`).catch(() => {});

    await rawPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "addresses" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "user_id" TEXT,
        "fullName" TEXT NOT NULL,
        "full_name" TEXT,
        "phone" TEXT NOT NULL,
        "streetAddress" TEXT,
        "street_address" TEXT,
        "addressLine1" TEXT,
        "addressLine2" TEXT,
        "landmark" TEXT,
        "city" TEXT NOT NULL,
        "state" TEXT NOT NULL,
        "postalCode" TEXT NOT NULL,
        "postal_code" TEXT,
        "country" TEXT NOT NULL DEFAULT 'India',
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "is_default" BOOLEAN NOT NULL DEFAULT false,
        "type" TEXT NOT NULL DEFAULT 'HOME',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});

    // 11. Create services, reviews, coupons tables if not exists
    await rawPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "services" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "shortDescription" TEXT,
        "short_description" TEXT,
        "description" TEXT,
        "imageUrl" TEXT,
        "image_url" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "isFeatured" BOOLEAN NOT NULL DEFAULT false,
        "is_featured" BOOLEAN NOT NULL DEFAULT false,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "services_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});

    await rawPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "product_id" TEXT,
        "userId" TEXT,
        "user_id" TEXT,
        "userName" TEXT NOT NULL,
        "user_name" TEXT,
        "rating" INTEGER NOT NULL DEFAULT 5,
        "title" TEXT,
        "comment" TEXT NOT NULL,
        "verifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
        "verified_purchase" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});

    await rawPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "coupons" (
        "id" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "description" TEXT,
        "type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
        "discountValue" DECIMAL(10,2) NOT NULL,
        "discount_value" DECIMAL(10,2),
        "minOrderAmount" DECIMAL(10,2) DEFAULT 0,
        "min_order_amount" DECIMAL(10,2),
        "maxDiscount" DECIMAL(10,2),
        "max_discount" DECIMAL(10,2),
        "usageLimit" INTEGER,
        "usage_limit" INTEGER,
        "usageCount" INTEGER NOT NULL DEFAULT 0,
        "usage_count" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "startDate" TIMESTAMP(3),
        "endDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});

    // Ensure columns for existing databases (camelCase and snake_case)
    const alterColStatements = [
      // custom_orders
      `ALTER TABLE "custom_orders" ADD COLUMN IF NOT EXISTS "customOrderName" TEXT;`,
      `ALTER TABLE "custom_orders" ADD COLUMN IF NOT EXISTS "custom_order_name" TEXT;`,
      `ALTER TABLE "custom_orders" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;`,
      `ALTER TABLE "custom_orders" ADD COLUMN IF NOT EXISTS "image_url" TEXT;`,
      `ALTER TABLE "custom_orders" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "custom_orders" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT false;`,
      // products
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "hasSizes" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "has_sizes" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "hasColours" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "has_colours" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "requiresCustomization" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "requires_customization" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "requiresImageUpload" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "requires_image_upload" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "minimumImageUploads" INTEGER DEFAULT 1;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "minimum_image_uploads" INTEGER DEFAULT 1;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "maximumImageUploads" INTEGER DEFAULT 5;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "maximum_image_uploads" INTEGER DEFAULT 5;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "specifications" JSONB;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight" DECIMAL(8,2);`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "length" DECIMAL(8,2);`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "width" DECIMAL(8,2);`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "height" DECIMAL(8,2);`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "seo_title" TEXT;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "seo_description" TEXT;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "meta_description" TEXT;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "shortDescription" TEXT;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "short_description" TEXT;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "image_url" TEXT;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "discountPercentage" DECIMAL(5,2) DEFAULT 0;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "discount_percentage" DECIMAL(5,2) DEFAULT 0;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "taxPercentage" DECIMAL(5,2) DEFAULT 0;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tax_percentage" DECIMAL(5,2) DEFAULT 0;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stockQuantity" INTEGER NOT NULL DEFAULT 10;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stock_quantity" INTEGER NOT NULL DEFAULT 10;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "lowStockThreshold" INTEGER DEFAULT 5;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "low_stock_threshold" INTEGER DEFAULT 5;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isBestSeller" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_best_seller" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isNewArrival" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_new_arrival" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;`,
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category_id" TEXT;`,
      // product_variants
      `ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "size" TEXT;`,
      `ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "colour" TEXT;`,
      `ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "wattage" TEXT;`,
      `ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "attributes" JSONB;`,
      `ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "stockQuantity" INTEGER NOT NULL DEFAULT 10;`,
      `ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "stock_quantity" INTEGER NOT NULL DEFAULT 10;`,
      // orders
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "orderNumber" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_number" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "userId" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "user_id" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shippingProvider" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_provider" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "awbNumber" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "awb_number" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_number" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipmentId" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipment_id" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "estimatedDelivery" TIMESTAMP(3);`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "estimated_delivery" TIMESTAMP(3);`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipmentStatus" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipment_status" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pickupRequested" BOOLEAN DEFAULT false;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pickup_requested" BOOLEAN DEFAULT false;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "labelUrl" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "label_url" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "trackingUrl" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_url" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "manifestUrl" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "manifest_url" TEXT;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "lastTrackingUpdate" TIMESTAMP(3);`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "last_tracking_update" TIMESTAMP(3);`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "trackingHistory" JSONB;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_history" JSONB;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shippingAddress" JSONB;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_address" JSONB;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "billingAddress" JSONB;`,
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "billing_address" JSONB;`,
      // order_items
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "selectedSize" TEXT;`,
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "selected_size" TEXT;`,
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "selectedColour" TEXT;`,
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "selected_colour" TEXT;`,
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "selectedWattage" TEXT;`,
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "selected_wattage" TEXT;`,
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "customizationText" TEXT;`,
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "customization_text" TEXT;`,
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "productTitle" TEXT;`,
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "product_title" TEXT;`,
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;`,
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "image_url" TEXT;`
    ];

    for (const sql of alterColStatements) {
      try {
        await rawPrisma.$executeRawUnsafe(sql);
      } catch (_) {}
    }

    // Mirror data across both column casings
    const syncStatements = [
      `UPDATE "custom_orders" SET "customOrderName" = "custom_order_name" WHERE "customOrderName" IS NULL AND "custom_order_name" IS NOT NULL;`,
      `UPDATE "custom_orders" SET "custom_order_name" = "customOrderName" WHERE "custom_order_name" IS NULL AND "customOrderName" IS NOT NULL;`,
      `UPDATE "custom_orders" SET "imageUrl" = "image_url" WHERE "imageUrl" IS NULL AND "image_url" IS NOT NULL;`,
      `UPDATE "custom_orders" SET "image_url" = "imageUrl" WHERE "image_url" IS NULL AND "imageUrl" IS NOT NULL;`,
      `UPDATE "custom_orders" SET "isPublic" = "is_public" WHERE "isPublic" IS NOT TRUE AND "is_public" IS TRUE;`,
      `UPDATE "custom_orders" SET "is_public" = "isPublic" WHERE "is_public" IS NOT TRUE AND "isPublic" IS TRUE;`,
      `UPDATE "products" SET "hasSizes" = "has_sizes" WHERE "hasSizes" IS NOT TRUE AND "has_sizes" IS TRUE;`,
      `UPDATE "products" SET "has_sizes" = "hasSizes" WHERE "has_sizes" IS NOT TRUE AND "hasSizes" IS TRUE;`,
      `UPDATE "products" SET "hasColours" = "has_colours" WHERE "hasColours" IS NOT TRUE AND "has_colours" IS TRUE;`,
      `UPDATE "products" SET "has_colours" = "hasColours" WHERE "has_colours" IS NOT TRUE AND "hasColours" IS TRUE;`,
      `UPDATE "products" SET "imageUrl" = "image_url" WHERE "imageUrl" IS NULL AND "image_url" IS NOT NULL;`,
      `UPDATE "products" SET "image_url" = "imageUrl" WHERE "image_url" IS NULL AND "imageUrl" IS NOT NULL;`,
      `UPDATE "products" SET "categoryId" = "category_id" WHERE "categoryId" IS NULL AND "category_id" IS NOT NULL;`,
      `UPDATE "products" SET "category_id" = "categoryId" WHERE "category_id" IS NULL AND "categoryId" IS NOT NULL;`,
      `UPDATE "orders" SET "orderNumber" = "order_number" WHERE "orderNumber" IS NULL AND "order_number" IS NOT NULL;`,
      `UPDATE "orders" SET "order_number" = "orderNumber" WHERE "order_number" IS NULL AND "orderNumber" IS NOT NULL;`,
      `UPDATE "orders" SET "userId" = "user_id" WHERE "userId" IS NULL AND "user_id" IS NOT NULL;`,
      `UPDATE "orders" SET "user_id" = "userId" WHERE "user_id" IS NULL AND "userId" IS NOT NULL;`
    ];
    for (const sql of syncStatements) {
      try {
        await rawPrisma.$executeRawUnsafe(sql);
      } catch (_) {}
    }

    // Indexes
    const indexList = [
      `CREATE INDEX IF NOT EXISTS "custom_orders_phone_idx" ON "custom_orders"("phone");`,
      `CREATE INDEX IF NOT EXISTS "custom_orders_paymentStatus_idx" ON "custom_orders"("paymentStatus");`,
      `CREATE INDEX IF NOT EXISTS "custom_orders_isPublic_idx" ON "custom_orders"("isPublic");`,
      `CREATE INDEX IF NOT EXISTS "custom_orders_razorpayOrderId_idx" ON "custom_orders"("razorpayOrderId");`,
      `CREATE INDEX IF NOT EXISTS "custom_orders_razorpayQrId_idx" ON "custom_orders"("razorpayQrId");`,
      `CREATE INDEX IF NOT EXISTS "custom_orders_createdAt_idx" ON "custom_orders"("createdAt" DESC);`,
      `CREATE INDEX IF NOT EXISTS "custom_order_reviews_order_idx" ON "custom_order_reviews"("customOrderId");`,
      `CREATE INDEX IF NOT EXISTS "custom_order_reviews_isApproved_createdAt_idx" ON "custom_order_reviews"("isApproved", "createdAt" DESC);`,
      `CREATE INDEX IF NOT EXISTS "custom_order_reviews_status_idx" ON "custom_order_reviews"("status");`,
      `CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products"("categoryId");`,
      `CREATE INDEX IF NOT EXISTS "products_isActive_idx" ON "products"("isActive");`,
      `CREATE INDEX IF NOT EXISTS "product_images_productId_idx" ON "product_images"("productId");`,
      `CREATE INDEX IF NOT EXISTS "product_variants_productId_idx" ON "product_variants"("productId");`,
      `CREATE INDEX IF NOT EXISTS "product_lamp_options_product_id_idx" ON "product_lamp_options"("product_id");`,
      `CREATE INDEX IF NOT EXISTS "orders_razorpayOrderId_idx" ON "orders"("razorpayOrderId");`,
      `CREATE INDEX IF NOT EXISTS "orders_awbNumber_idx" ON "orders"("awbNumber");`,
      `CREATE INDEX IF NOT EXISTS "orders_trackingNumber_idx" ON "orders"("trackingNumber");`,
      `CREATE INDEX IF NOT EXISTS "orders_shipmentId_idx" ON "orders"("shipmentId");`,
      `CREATE INDEX IF NOT EXISTS "orders_paymentStatus_idx" ON "orders"("paymentStatus");`,
      `CREATE INDEX IF NOT EXISTS "orders_userId_paymentStatus_idx" ON "orders"("userId", "paymentStatus");`,
      `CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt" DESC);`,
      `CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId");`,
      `CREATE INDEX IF NOT EXISTS "order_items_variantId_idx" ON "order_items"("variantId");`,
      `CREATE INDEX IF NOT EXISTS "addresses_userId_isDefault_idx" ON "addresses"("userId", "isDefault");`,
      `CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users"("phone");`
    ];
    for (const sql of indexList) {
      try {
        await rawPrisma.$executeRawUnsafe(sql);
      } catch (_) {}
    }

    // Seed database if empty
    await seedDatabaseIfEmpty();

    dbSchemaEnsured = true;
    console.log('[Database] Database schema verified, auto-migrated, and ensured successfully.');
  } catch (err: any) {
    console.warn('[Database] Notice during database schema verification:', err?.message || err);
  }
}

async function seedDatabaseIfEmpty() {
  if (!hasDatabaseUrl) return;
  try {
    const catCountRes: any = await rawPrisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "categories"').catch(() => null);
    const catCount = Number(catCountRes?.[0]?.count || 0);
    if (catCount === 0 && Array.isArray(INITIAL_CATEGORIES)) {
      console.log('[Database] Categories table empty, seeding INITIAL_CATEGORIES...');
      for (const cat of INITIAL_CATEGORIES) {
        await rawPrisma.$executeRawUnsafe(
          `INSERT INTO "categories" ("id", "name", "slug", "description", "imageUrl", "image_url", "isActive", "is_active")
           VALUES ($1, $2, $3, $4, $5, $5, true, true)
           ON CONFLICT ("id") DO NOTHING`,
          cat.id, cat.name, cat.slug, cat.description || null, cat.imageUrl || null
        ).catch(() => {});
      }
    }

    const prodCountRes: any = await rawPrisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "products"').catch(() => null);
    const prodCount = Number(prodCountRes?.[0]?.count || 0);
    if (prodCount === 0 && Array.isArray(INITIAL_PRODUCTS)) {
      console.log('[Database] Products table empty, seeding INITIAL_PRODUCTS...');
      for (const prod of INITIAL_PRODUCTS) {
        const title = (prod as any).title || prod.name;
        const mainImg = Array.isArray((prod as any).images) && (prod as any).images.length > 0 ? (prod as any).images[0] : ((prod as any).imageUrl || null);
        await rawPrisma.$executeRawUnsafe(
          `INSERT INTO "products" (
            "id", "name", "slug", "sku", "shortDescription", "short_description", "description",
            "price", "mrp", "discountPercentage", "discount_percentage", "taxPercentage", "tax_percentage",
            "stockQuantity", "stock_quantity", "lowStockThreshold", "low_stock_threshold",
            "imageUrl", "image_url", "isActive", "is_active", "isFeatured", "is_featured",
            "isBestSeller", "is_best_seller", "isNewArrival", "is_new_arrival",
            "categoryId", "category_id", "hasSizes", "has_sizes", "hasColours", "has_colours"
          ) VALUES (
            $1, $2, $3, $4, $5, $5, $6,
            $7, $8, $9, $9, $10, $10,
            $11, $11, $12, $12,
            $13, $13, true, true, $14, $14,
            $15, $15, $16, $16,
            $17, $17, $18, $18, $19, $19
          ) ON CONFLICT ("id") DO NOTHING`,
          prod.id,
          title,
          prod.slug,
          prod.sku,
          (prod as any).shortDescription || null,
          prod.description || null,
          prod.price,
          (prod as any).mrp || prod.price,
          (prod as any).discountPercentage || 0,
          (prod as any).taxPercentage || 0,
          (prod as any).stockQuantity ?? 10,
          (prod as any).lowStockThreshold ?? 5,
          mainImg,
          Boolean((prod as any).isFeatured),
          Boolean((prod as any).isBestSeller),
          Boolean((prod as any).isNewArrival),
          prod.categoryId || null,
          Boolean((prod as any).hasSizes),
          Boolean((prod as any).hasColours)
        ).catch(() => {});

        if (mainImg) {
          await rawPrisma.$executeRawUnsafe(
            `INSERT INTO "product_images" ("id", "productId", "product_id", "url", "altText", "alt_text", "sortOrder", "sort_order", "isPrimary", "is_primary")
             VALUES ($1, $2, $2, $3, $4, $4, 0, 0, true, true)
             ON CONFLICT ("id") DO NOTHING`,
            `img-${prod.id}-0`, prod.id, mainImg, title
          ).catch(() => {});
        }
      }
    }
  } catch (seedErr: any) {
    console.warn('[Database] Notice during database initial seeding:', seedErr?.message || seedErr);
  }
}

export function normalizeCustomOrder(row: any): any {
  if (!row || typeof row !== 'object') return row;

  const id = String(row.id || row.order_id || row.orderId || '');
  const customerName = String(row.customerName ?? row.customer_name ?? row.name ?? 'Valued Customer');
  const phone = String(row.phone ?? row.phoneNumber ?? row.phone_number ?? '');
  const email = row.email ?? row.customerEmail ?? row.customer_email ?? null;
  const description = row.description ?? row.desc ?? row.customOrderName ?? row.custom_order_name ?? '';
  const customOrderName = String(row.customOrderName ?? row.custom_order_name ?? row.title ?? row.description ?? 'Custom 3D Print');
  const imageUrl = row.imageUrl ?? row.image_url ?? row.image ?? null;
  const isPublic = Boolean(row.isPublic ?? row.is_public ?? false);
  const amount = Number(row.amount ?? row.totalAmount ?? row.total ?? 0);
  const deliveryType = String(row.deliveryType ?? row.delivery_type ?? 'STORE_PICKUP');
  const notes = row.notes ?? row.note ?? null;
  const paymentStatus = String(row.paymentStatus ?? row.payment_status ?? 'AWAITING_PAYMENT').toUpperCase();
  const razorpayOrderId = row.razorpayOrderId ?? row.razorpay_order_id ?? null;
  const razorpayQrId = row.razorpayQrId ?? row.razorpay_qr_id ?? null;
  const qrImageUrl = row.qrImageUrl ?? row.qr_image_url ?? null;
  const paymentLink = row.paymentLink ?? row.payment_link ?? null;
  const isSimulated = Boolean(row.isSimulated ?? row.is_simulated ?? false);
  const expiresAt = row.expiresAt ?? row.expires_at ?? null;
  const paidAt = row.paidAt ?? row.paid_at ?? null;
  const createdAt = row.createdAt ?? row.created_at ?? new Date().toISOString();
  const updatedAt = row.updatedAt ?? row.updated_at ?? createdAt;

  return {
    id,
    customerName,
    phone,
    email,
    description,
    customOrderName,
    imageUrl,
    isPublic,
    amount,
    deliveryType,
    notes,
    paymentStatus,
    razorpayOrderId,
    razorpayQrId,
    qrImageUrl,
    paymentLink,
    isSimulated,
    expiresAt,
    paidAt,
    createdAt,
    updatedAt,
    // Provide snake_case mirrors for 100% database & component compatibility
    customer_name: customerName,
    custom_order_name: customOrderName,
    image_url: imageUrl,
    is_public: isPublic,
    delivery_type: deliveryType,
    payment_status: paymentStatus,
    razorpay_order_id: razorpayOrderId,
    razorpay_qr_id: razorpayQrId,
    qr_image_url: qrImageUrl,
    payment_link: paymentLink,
    is_simulated: isSimulated,
    expires_at: expiresAt,
    paid_at: paidAt,
    created_at: createdAt,
    updated_at: updatedAt
  };
}

export function normalizeCustomOrderReview(row: any): any {
  if (!row || typeof row !== 'object') return row;

  const id = String(row.id || '');
  const customOrderId = String(row.customOrderId ?? row.custom_order_id ?? '');
  const userId = row.userId ?? row.user_id ?? null;
  const userName = String(row.userName ?? row.user_name ?? row.reviewerName ?? row.reviewer_name ?? 'Anonymous Reviewer');
  const rating = Number(row.rating ?? 5);
  const title = row.title ?? null;
  const comment = String(row.comment ?? '');
  const isApproved = Boolean(row.isApproved ?? row.is_approved ?? (row.status === 'APPROVED'));
  const status = String(row.status ?? (isApproved ? 'APPROVED' : 'PENDING')).toUpperCase();
  const createdAt = row.createdAt ?? row.created_at ?? new Date().toISOString();

  return {
    id,
    customOrderId,
    userId,
    userName,
    reviewerName: userName,
    rating,
    title,
    comment,
    isApproved,
    status,
    createdAt,
    // snake_case mirrors
    custom_order_id: customOrderId,
    user_id: userId,
    user_name: userName,
    reviewer_name: userName,
    is_approved: isApproved,
    created_at: createdAt
  };
}

const VALID_PRISMA_CUSTOM_ORDER_KEYS = new Set([
  'id',
  'customerName',
  'phone',
  'email',
  'description',
  'customOrderName',
  'imageUrl',
  'isPublic',
  'amount',
  'deliveryType',
  'notes',
  'paymentStatus',
  'razorpayOrderId',
  'razorpayQrId',
  'qrImageUrl',
  'paymentLink',
  'isSimulated',
  'expiresAt',
  'paidAt',
  'createdAt',
  'updatedAt'
]);

export function cleanPrismaCustomOrderData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const clean: any = {};
  const source = {
    ...data,
    customerName: data.customerName ?? data.customer_name,
    customOrderName: data.customOrderName ?? data.custom_order_name,
    imageUrl: data.imageUrl ?? data.image_url,
    isPublic: data.isPublic !== undefined ? Boolean(data.isPublic) : (data.is_public !== undefined ? Boolean(data.is_public) : undefined),
    deliveryType: data.deliveryType ?? data.delivery_type,
    paymentStatus: data.paymentStatus ?? data.payment_status,
    razorpayOrderId: data.razorpayOrderId ?? data.razorpay_order_id,
    razorpayQrId: data.razorpayQrId ?? data.razorpay_qr_id,
    qrImageUrl: data.qrImageUrl ?? data.qr_image_url,
    paymentLink: data.paymentLink ?? data.payment_link,
    isSimulated: data.isSimulated !== undefined ? Boolean(data.isSimulated) : (data.is_simulated !== undefined ? Boolean(data.is_simulated) : undefined),
    expiresAt: data.expiresAt ?? data.expires_at,
    paidAt: data.paidAt ?? data.paid_at,
    createdAt: data.createdAt ?? data.created_at,
    updatedAt: data.updatedAt ?? data.updated_at
  };

  for (const k of Object.keys(source)) {
    if (VALID_PRISMA_CUSTOM_ORDER_KEYS.has(k) && source[k] !== undefined) {
      let v = source[k];
      if ((k === 'expiresAt' || k === 'paidAt' || k === 'createdAt' || k === 'updatedAt') && v) {
        if (typeof v === 'string' || typeof v === 'number') {
          const d = new Date(v);
          if (!isNaN(d.getTime())) v = d;
        }
      }
      clean[k] = v;
    }
  }
  return clean;
}

const CUSTOM_ORDER_DB_COLUMN_MAP: Record<string, string> = {
  customerName: 'customer_name',
  customOrderName: 'custom_order_name',
  imageUrl: 'image_url',
  isPublic: 'is_public',
  deliveryType: 'delivery_type',
  paymentStatus: 'payment_status',
  razorpayOrderId: 'razorpay_order_id',
  razorpayQrId: 'razorpay_qr_id',
  qrImageUrl: 'qr_image_url',
  paymentLink: 'payment_link',
  isSimulated: 'is_simulated',
  expiresAt: 'expires_at',
  paidAt: 'paid_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  phone: 'phone',
  email: 'email',
  description: 'description',
  amount: 'amount',
  notes: 'notes',
  id: 'id'
};

async function executeResilientCustomOrderQuery(prop: string, args: any[]): Promise<any> {
  const memoryHandler = memoryStore.createModelHandler('customOrder');

  // Strategy 1: If database URL is available, attempt Prisma first
  if (hasDatabaseUrl) {
    if (!dbSchemaEnsured) {
      await ensureDbSchema().catch(() => {});
    }

    try {
      const rawModel = (rawPrisma as any).customOrder;
      if (rawModel && typeof rawModel[prop] === 'function') {
        const sanitizedArgs = args.map((arg: any) => {
          if (!arg || typeof arg !== 'object') return arg;
          const cloned = { ...arg };
          if (cloned.data) {
            cloned.data = cleanPrismaCustomOrderData(cloned.data);
          }
          if (cloned.create) {
            cloned.create = cleanPrismaCustomOrderData(cloned.create);
          }
          if (cloned.update) {
            cloned.update = cleanPrismaCustomOrderData(cloned.update);
          }
          return cloned;
        });

        const result = await rawModel[prop](...sanitizedArgs);
        if (Array.isArray(result) && result.length > 0) {
          return result.map(normalizeCustomOrder);
        }
        if (result && typeof result === 'object' && !Array.isArray(result) && prop !== 'findMany') {
          const normalized = normalizeCustomOrder(result);
          // Keep in-memory cache synchronized with PostgreSQL
          try {
            if (prop === 'update') {
              await (memoryHandler as any).update({ where: args[0]?.where, data: sanitizedArgs[0]?.data || args[0]?.data });
            } else if (prop === 'create' || prop === 'upsert') {
              await (memoryHandler as any).upsert({ where: { id: normalized.id }, update: normalized, create: normalized });
            } else if (prop === 'delete') {
              await (memoryHandler as any).delete({ where: args[0]?.where });
            }
          } catch (_) {}
          return normalized;
        }
      }
    } catch (prismaErr: any) {
      console.warn('[Prisma Custom Order] Standard Prisma model call threw, executing raw SQL fallback:', prismaErr?.message || prismaErr);
    }

    // Raw SQL fallback directly targeting PostgreSQL
    if (prop === 'findMany') {
      const queries = [
        'SELECT * FROM "custom_orders" ORDER BY "created_at" DESC',
        'SELECT * FROM "custom_orders" ORDER BY "createdAt" DESC',
        'SELECT * FROM custom_orders ORDER BY created_at DESC',
        'SELECT * FROM "custom_orders"',
        'SELECT * FROM custom_orders'
      ];
      for (const q of queries) {
        try {
          const rawRows = await rawPrisma.$queryRawUnsafe(q);
          if (Array.isArray(rawRows) && rawRows.length > 0) {
            let list = rawRows.map(normalizeCustomOrder);
            const filter = args[0]?.where;
            if (filter?.isPublic !== undefined) {
              list = list.filter((item: any) => item.isPublic === filter.isPublic);
            }
            if (filter?.paymentStatus !== undefined) {
              list = list.filter((item: any) => item.paymentStatus === filter.paymentStatus);
            }
            return list;
          }
        } catch (_) {}
      }
    } else if (prop === 'findUnique' || prop === 'findFirst') {
      const whereId = args[0]?.where?.id;
      if (whereId) {
        const queries = [
          'SELECT * FROM "custom_orders" WHERE "id" = $1 LIMIT 1',
          'SELECT * FROM custom_orders WHERE id = $1 LIMIT 1'
        ];
        for (const q of queries) {
          try {
            const rawRows: any = await rawPrisma.$queryRawUnsafe(q, whereId);
            if (Array.isArray(rawRows) && rawRows.length > 0) {
              return normalizeCustomOrder(rawRows[0]);
            }
          } catch (_) {}
        }
      }
    } else if (prop === 'update' || prop === 'upsert') {
      const whereId = args[0]?.where?.id;
      const rawData = prop === 'upsert' ? { ...(args[0]?.create || {}), ...(args[0]?.update || {}) } : (args[0]?.data || {});
      const cleanData = cleanPrismaCustomOrderData(rawData);
      if (whereId && Object.keys(cleanData).length > 0) {
        // 1. Detect which columns exist in PostgreSQL
        let existingCols = new Set<string>();
        try {
          const colRows: any = await rawPrisma.$queryRawUnsafe(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'custom_orders' OR table_name = 'CustomOrder'`
          );
          if (Array.isArray(colRows)) {
            for (const r of colRows) {
              if (r?.column_name) existingCols.add(String(r.column_name));
            }
          }
        } catch (_) {}

        // If columns detected, write to all matching columns (both camelCase and snake_case)
        if (existingCols.size > 0) {
          const setClauses: string[] = [];
          const values: any[] = [];
          let idx = 1;

          for (const [field, val] of Object.entries(cleanData)) {
            const camelCol = field;
            const snakeCol = CUSTOM_ORDER_DB_COLUMN_MAP[field] || field;

            if (existingCols.has(camelCol)) {
              setClauses.push(`"${camelCol}" = $${idx++}`);
              values.push(val);
            }
            if (snakeCol !== camelCol && existingCols.has(snakeCol)) {
              setClauses.push(`"${snakeCol}" = $${idx++}`);
              values.push(val);
            }
          }

          if (setClauses.length > 0) {
            values.push(whereId);
            const sql = `UPDATE "custom_orders" SET ${setClauses.join(', ')} WHERE "id" = $${idx} RETURNING *`;
            try {
              const rawResult: any = await rawPrisma.$queryRawUnsafe(sql, ...values);
              if (Array.isArray(rawResult) && rawResult.length > 0) {
                const normalized = normalizeCustomOrder(rawResult[0]);
                try { await (memoryHandler as any).update({ where: { id: whereId }, data: cleanData }); } catch (_) {}
                return normalized;
              }
            } catch (err: any) {
              console.warn('[Raw SQL Update with column detection error]:', err?.message || err);
            }
          }
        }

        // Fallback A: Direct camelCase columns
        try {
          const setClausesCamel: string[] = [];
          const valuesCamel: any[] = [];
          let idx = 1;
          for (const [field, val] of Object.entries(cleanData)) {
            setClausesCamel.push(`"${field}" = $${idx++}`);
            valuesCamel.push(val);
          }
          valuesCamel.push(whereId);
          const sql = `UPDATE "custom_orders" SET ${setClausesCamel.join(', ')} WHERE "id" = $${idx} RETURNING *`;
          const rawResult: any = await rawPrisma.$queryRawUnsafe(sql, ...valuesCamel);
          if (Array.isArray(rawResult) && rawResult.length > 0) {
            const normalized = normalizeCustomOrder(rawResult[0]);
            try { await (memoryHandler as any).update({ where: { id: whereId }, data: cleanData }); } catch (_) {}
            return normalized;
          }
        } catch (_) {}

        // Fallback B: Direct snake_case columns
        try {
          const setClausesSnake: string[] = [];
          const valuesSnake: any[] = [];
          let idx = 1;
          for (const [field, val] of Object.entries(cleanData)) {
            const col = CUSTOM_ORDER_DB_COLUMN_MAP[field] || field;
            setClausesSnake.push(`"${col}" = $${idx++}`);
            valuesSnake.push(val);
          }
          valuesSnake.push(whereId);
          const sql = `UPDATE "custom_orders" SET ${setClausesSnake.join(', ')} WHERE "id" = $${idx} RETURNING *`;
          const rawResult: any = await rawPrisma.$queryRawUnsafe(sql, ...valuesSnake);
          if (Array.isArray(rawResult) && rawResult.length > 0) {
            const normalized = normalizeCustomOrder(rawResult[0]);
            try { await (memoryHandler as any).update({ where: { id: whereId }, data: cleanData }); } catch (_) {}
            return normalized;
          }
        } catch (_) {}
      }
    } else if (prop === 'create') {
      const cleanData = cleanPrismaCustomOrderData(args[0]?.data || {});
      const id = cleanData.id || `co-${Date.now()}`;
      cleanData.id = id;

      // Try camelCase insert
      try {
        const cols: string[] = [];
        const placeholders: string[] = [];
        const values: any[] = [];
        let idx = 1;
        for (const [field, val] of Object.entries(cleanData)) {
          cols.push(`"${field}"`);
          placeholders.push(`$${idx++}`);
          values.push(val);
        }
        const sql = `INSERT INTO "custom_orders" (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        const rawResult: any = await rawPrisma.$queryRawUnsafe(sql, ...values);
        if (Array.isArray(rawResult) && rawResult.length > 0) {
          const normalized = normalizeCustomOrder(rawResult[0]);
          try { await (memoryHandler as any).create({ data: cleanData }); } catch (_) {}
          return normalized;
        }
      } catch (_) {}

      // Try snake_case insert
      try {
        const cols: string[] = [];
        const placeholders: string[] = [];
        const values: any[] = [];
        let idx = 1;
        for (const [field, val] of Object.entries(cleanData)) {
          const col = CUSTOM_ORDER_DB_COLUMN_MAP[field] || field;
          cols.push(`"${col}"`);
          placeholders.push(`$${idx++}`);
          values.push(val);
        }
        const sql = `INSERT INTO "custom_orders" (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        const rawResult: any = await rawPrisma.$queryRawUnsafe(sql, ...values);
        if (Array.isArray(rawResult) && rawResult.length > 0) {
          const normalized = normalizeCustomOrder(rawResult[0]);
          try { await (memoryHandler as any).create({ data: cleanData }); } catch (_) {}
          return normalized;
        }
      } catch (_) {}
    } else if (prop === 'delete') {
      const whereId = args[0]?.where?.id;
      if (whereId) {
        try {
          await rawPrisma.$executeRawUnsafe('DELETE FROM "custom_orders" WHERE "id" = $1', whereId);
          try { await (memoryHandler as any).delete({ where: { id: whereId } }); } catch (_) {}
          return { id: whereId };
        } catch (_) {}
      }
    }
  }

  // Strategy 2: Direct Supabase PostgREST client if configured
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      if (prop === 'findMany') {
        const { data, error } = await (supabaseAdmin as any).from('custom_orders').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          let list = data.map(normalizeCustomOrder);
          const filter = args[0]?.where;
          if (filter?.isPublic !== undefined) {
            list = list.filter((item: any) => item.isPublic === filter.isPublic);
          }
          if (filter?.paymentStatus !== undefined) {
            list = list.filter((item: any) => item.paymentStatus === filter.paymentStatus);
          }
          if (args[0]?.orderBy?.createdAt === 'desc') {
            list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          }
          return list;
        }
      } else if (prop === 'findUnique' || prop === 'findFirst') {
        const whereId = args[0]?.where?.id;
        if (whereId) {
          const { data, error } = await (supabaseAdmin as any).from('custom_orders').select('*').eq('id', whereId).maybeSingle();
          if (!error && data) return normalizeCustomOrder(data);
        }
      } else if (prop === 'create') {
        const clean = cleanPrismaCustomOrderData(args[0]?.data);
        const supaData: any = {};
        for (const [k, v] of Object.entries(clean)) {
          const col = CUSTOM_ORDER_DB_COLUMN_MAP[k] || k;
          supaData[col] = v;
        }
        let { data: created, error } = await (supabaseAdmin as any).from('custom_orders').insert(supaData).select().maybeSingle();
        if (error) {
          // Retry with direct camelCase keys
          const camelData: any = {};
          for (const [k, v] of Object.entries(clean)) {
            camelData[k] = v;
          }
          const retry = await (supabaseAdmin as any).from('custom_orders').insert(camelData).select().maybeSingle();
          if (!retry.error && retry.data) {
            created = retry.data;
            error = null;
          }
        }
        if (!error && created) {
          const normalized = normalizeCustomOrder(created);
          try { await (memoryHandler as any).create({ data: clean }); } catch (_) {}
          return normalized;
        }
      } else if (prop === 'update') {
        const whereId = args[0]?.where?.id;
        const clean = cleanPrismaCustomOrderData(args[0]?.data);
        const supaData: any = {};
        for (const [k, v] of Object.entries(clean)) {
          const col = CUSTOM_ORDER_DB_COLUMN_MAP[k] || k;
          supaData[col] = v;
        }
        if (whereId) {
          let { data: updated, error } = await (supabaseAdmin as any).from('custom_orders').update(supaData).eq('id', whereId).select().maybeSingle();
          if (error) {
            // Retry with direct camelCase keys
            const camelData: any = {};
            for (const [k, v] of Object.entries(clean)) {
              camelData[k] = v;
            }
            const retry = await (supabaseAdmin as any).from('custom_orders').update(camelData).eq('id', whereId).select().maybeSingle();
            if (!retry.error && retry.data) {
              updated = retry.data;
              error = null;
            }
          }
          if (!error && updated) {
            const normalized = normalizeCustomOrder(updated);
            try { await (memoryHandler as any).update({ where: { id: whereId }, data: clean }); } catch (_) {}
            return normalized;
          }
        }
      } else if (prop === 'delete') {
        const whereId = args[0]?.where?.id;
        if (whereId) {
          await (supabaseAdmin as any).from('custom_orders').delete().eq('id', whereId);
          try { await (memoryHandler as any).delete({ where: { id: whereId } }); } catch (_) {}
          return { id: whereId };
        }
      }
    } catch (supaErr) {
      console.warn('[Supabase Bridge] Custom order error:', supaErr);
    }
  }

  // Strategy 3: In-memory store fallback
  const fn = (memoryHandler as any)[prop];
  if (typeof fn === 'function') {
    const memResult = await fn(...args);
    if (Array.isArray(memResult)) {
      return memResult.map(normalizeCustomOrder);
    }
    if (memResult && typeof memResult === 'object') {
      return normalizeCustomOrder(memResult);
    }
    return memResult;
  }
  return null;
}

const VALID_PRISMA_CUSTOM_ORDER_REVIEW_KEYS = new Set([
  'id',
  'customOrderId',
  'userId',
  'userName',
  'rating',
  'title',
  'comment',
  'isApproved',
  'status',
  'createdAt'
]);

const CUSTOM_ORDER_REVIEW_DB_COLUMN_MAP: Record<string, string> = {
  customOrderId: 'custom_order_id',
  userId: 'user_id',
  userName: 'user_name',
  isApproved: 'is_approved'
};

export function cleanPrismaCustomOrderReviewData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const clean: any = {};
  const source = {
    ...data,
    customOrderId: data.customOrderId ?? data.custom_order_id,
    userId: data.userId ?? data.user_id,
    userName: data.userName ?? data.user_name ?? data.reviewerName ?? data.reviewer_name,
    isApproved: data.isApproved !== undefined ? Boolean(data.isApproved) : (data.is_approved !== undefined ? Boolean(data.is_approved) : true),
    status: data.status ? String(data.status).toUpperCase() : (data.isApproved === false ? 'PENDING' : 'APPROVED'),
    createdAt: data.createdAt ?? data.created_at
  };

  for (const k of Object.keys(source)) {
    if (VALID_PRISMA_CUSTOM_ORDER_REVIEW_KEYS.has(k) && source[k] !== undefined) {
      let v = source[k];
      if (k === 'createdAt' && v) {
        if (typeof v === 'string' || typeof v === 'number') {
          const d = new Date(v);
          if (!isNaN(d.getTime())) v = d;
        }
      }
      clean[k] = v;
    }
  }
  return clean;
}

async function executeResilientCustomOrderReviewQuery(prop: string, args: any[]): Promise<any> {
  const memoryHandler = memoryStore.createModelHandler('customOrderReview');

  if (hasDatabaseUrl) {
    if (!dbSchemaEnsured) {
      await ensureDbSchema().catch(() => {});
    }

    try {
      const rawModel = (rawPrisma as any).customOrderReview;
      if (rawModel && typeof rawModel[prop] === 'function') {
        const sanitizedArgs = args.map((arg: any) => {
          if (!arg || typeof arg !== 'object') return arg;
          const cloned = { ...arg };
          if (cloned.data) {
            cloned.data = cleanPrismaCustomOrderReviewData(cloned.data);
          }
          if (cloned.create) {
            cloned.create = cleanPrismaCustomOrderReviewData(cloned.create);
          }
          if (cloned.update) {
            cloned.update = cleanPrismaCustomOrderReviewData(cloned.update);
          }
          return cloned;
        });

        const result = await rawModel[prop](...sanitizedArgs);
        if (Array.isArray(result) && result.length > 0) {
          return result.map(normalizeCustomOrderReview);
        }
        if (result && typeof result === 'object' && !Array.isArray(result) && prop !== 'findMany') {
          const normalized = normalizeCustomOrderReview(result);
          // Sync with in-memory store
          try {
            if (prop === 'create' || prop === 'upsert') {
              await (memoryHandler as any).upsert({ where: { id: normalized.id }, update: normalized, create: normalized });
            } else if (prop === 'update') {
              await (memoryHandler as any).update({ where: args[0]?.where, data: normalized });
            } else if (prop === 'delete') {
              await (memoryHandler as any).delete({ where: args[0]?.where });
            }
          } catch (_) {}
          return normalized;
        }
      }
    } catch (prismaErr: any) {
      console.warn('[Prisma Review] Standard call threw, falling back:', prismaErr?.message || prismaErr);
    }

    if (prop === 'findMany') {
      const queries = [
        'SELECT * FROM "custom_order_reviews" ORDER BY "createdAt" DESC',
        'SELECT * FROM "custom_order_reviews" ORDER BY "created_at" DESC',
        'SELECT * FROM custom_order_reviews ORDER BY created_at DESC',
        'SELECT * FROM "custom_order_reviews"',
        'SELECT * FROM custom_order_reviews'
      ];
      for (const q of queries) {
        try {
          const rawRows = await rawPrisma.$queryRawUnsafe(q);
          if (Array.isArray(rawRows) && rawRows.length > 0) {
            let list = rawRows.map(normalizeCustomOrderReview);
            const filter = args[0]?.where;
            if (filter?.isApproved !== undefined) {
              list = list.filter((r: any) => r.isApproved === filter.isApproved);
            }
            if (filter?.customOrderId?.in && Array.isArray(filter.customOrderId.in)) {
              list = list.filter((r: any) => filter.customOrderId.in.includes(r.customOrderId));
            } else if (filter?.customOrderId) {
              list = list.filter((r: any) => r.customOrderId === filter.customOrderId);
            }
            return list;
          }
        } catch (_) {}
      }
    } else if (prop === 'findUnique' || prop === 'findFirst') {
      const whereId = args[0]?.where?.id;
      if (whereId) {
        const queries = [
          'SELECT * FROM "custom_order_reviews" WHERE "id" = $1 LIMIT 1',
          'SELECT * FROM custom_order_reviews WHERE id = $1 LIMIT 1'
        ];
        for (const q of queries) {
          try {
            const rawRows: any = await rawPrisma.$queryRawUnsafe(q, whereId);
            if (Array.isArray(rawRows) && rawRows.length > 0) {
              return normalizeCustomOrderReview(rawRows[0]);
            }
          } catch (_) {}
        }
      }
    } else if (prop === 'create') {
      const cleanData = cleanPrismaCustomOrderReviewData(args[0]?.data || {});
      const id = cleanData.id || `cor-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      cleanData.id = id;

      // Ensure custom_order exists for customOrderId to satisfy any potential foreign key
      const orderId = cleanData.customOrderId || 'general';
      try {
        await rawPrisma.$executeRawUnsafe(
          `INSERT INTO "custom_orders" ("id", "customerName", "phone", "amount", "isPublic") VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("id") DO NOTHING`,
          orderId,
          'Custom Order Customer',
          '0000000000',
          0,
          true
        );
      } catch (_) {}

      // Try camelCase raw SQL insert
      try {
        const cols: string[] = [];
        const placeholders: string[] = [];
        const values: any[] = [];
        let idx = 1;
        for (const [field, val] of Object.entries(cleanData)) {
          cols.push(`"${field}"`);
          placeholders.push(`$${idx++}`);
          values.push(val);
        }
        const sql = `INSERT INTO "custom_order_reviews" (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        const rawResult: any = await rawPrisma.$queryRawUnsafe(sql, ...values);
        if (Array.isArray(rawResult) && rawResult.length > 0) {
          const normalized = normalizeCustomOrderReview(rawResult[0]);
          try { await (memoryHandler as any).create({ data: cleanData }); } catch (_) {}
          return normalized;
        }
      } catch (_) {}

      // Try snake_case raw SQL insert
      try {
        const cols: string[] = [];
        const placeholders: string[] = [];
        const values: any[] = [];
        let idx = 1;
        for (const [field, val] of Object.entries(cleanData)) {
          const col = CUSTOM_ORDER_REVIEW_DB_COLUMN_MAP[field] || field;
          cols.push(`"${col}"`);
          placeholders.push(`$${idx++}`);
          values.push(val);
        }
        const sql = `INSERT INTO "custom_order_reviews" (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        const rawResult: any = await rawPrisma.$queryRawUnsafe(sql, ...values);
        if (Array.isArray(rawResult) && rawResult.length > 0) {
          const normalized = normalizeCustomOrderReview(rawResult[0]);
          try { await (memoryHandler as any).create({ data: cleanData }); } catch (_) {}
          return normalized;
        }
      } catch (_) {}
    } else if (prop === 'update') {
      const whereId = args[0]?.where?.id;
      const rawData = cleanPrismaCustomOrderReviewData(args[0]?.data || {});
      if (whereId && Object.keys(rawData).length > 0) {
        try {
          const setClauses: string[] = [];
          const values: any[] = [];
          let idx = 1;
          for (const [field, val] of Object.entries(rawData)) {
            setClauses.push(`"${field}" = $${idx++}`);
            values.push(val);
          }
          values.push(whereId);
          const sql = `UPDATE "custom_order_reviews" SET ${setClauses.join(', ')} WHERE "id" = $${idx} RETURNING *`;
          const rawResult: any = await rawPrisma.$queryRawUnsafe(sql, ...values);
          if (Array.isArray(rawResult) && rawResult.length > 0) {
            const normalized = normalizeCustomOrderReview(rawResult[0]);
            try { await (memoryHandler as any).update({ where: { id: whereId }, data: rawData }); } catch (_) {}
            return normalized;
          }
        } catch (_) {}
      }
    } else if (prop === 'delete') {
      const whereId = args[0]?.where?.id;
      if (whereId) {
        try {
          await rawPrisma.$executeRawUnsafe('DELETE FROM "custom_order_reviews" WHERE "id" = $1', whereId);
          try { await (memoryHandler as any).delete({ where: { id: whereId } }); } catch (_) {}
          return { id: whereId };
        } catch (_) {}
      }
    }
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      if (prop === 'findMany') {
        const { data, error } = await (supabaseAdmin as any).from('custom_order_reviews').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          let list = data.map(normalizeCustomOrderReview);
          const filter = args[0]?.where;
          if (filter?.isApproved !== undefined) {
            list = list.filter((r: any) => r.isApproved === filter.isApproved);
          }
          if (filter?.customOrderId?.in && Array.isArray(filter.customOrderId.in)) {
            list = list.filter((r: any) => filter.customOrderId.in.includes(r.customOrderId));
          } else if (filter?.customOrderId) {
            list = list.filter((r: any) => r.customOrderId === filter.customOrderId);
          }
          return list;
        }
      } else if (prop === 'create') {
        const itemData = cleanPrismaCustomOrderReviewData(args[0]?.data);
        const { data: created, error } = await (supabaseAdmin as any).from('custom_order_reviews').insert(itemData).select().maybeSingle();
        if (!error && created) {
          const normalized = normalizeCustomOrderReview(created);
          try { await (memoryHandler as any).create({ data: itemData }); } catch (_) {}
          return normalized;
        }
      } else if (prop === 'update') {
        const whereId = args[0]?.where?.id;
        const itemData = cleanPrismaCustomOrderReviewData(args[0]?.data);
        if (whereId) {
          const { data: updated, error } = await (supabaseAdmin as any).from('custom_order_reviews').update(itemData).eq('id', whereId).select().maybeSingle();
          if (!error && updated) {
            const normalized = normalizeCustomOrderReview(updated);
            try { await (memoryHandler as any).update({ where: { id: whereId }, data: itemData }); } catch (_) {}
            return normalized;
          }
        }
      } else if (prop === 'delete') {
        const whereId = args[0]?.where?.id;
        if (whereId) {
          await (supabaseAdmin as any).from('custom_order_reviews').delete().eq('id', whereId);
          try { await (memoryHandler as any).delete({ where: { id: whereId } }); } catch (_) {}
          return { id: whereId };
        }
      }
    } catch (supaErr) {
      console.warn('[Supabase Bridge] Review error:', supaErr);
    }
  }

  const fn = (memoryHandler as any)[prop];
  if (typeof fn === 'function') {
    const memResult = await fn(...args);
    if (Array.isArray(memResult)) {
      return memResult.map(normalizeCustomOrderReview);
    }
    if (memResult && typeof memResult === 'object') {
      return normalizeCustomOrderReview(memResult);
    }
    return memResult;
  }
  return null;
}

async function executeResilientProductQuery(prop: string, args: any[]): Promise<any> {
  const memoryHandler = memoryStore.createModelHandler('product');

  if (hasDatabaseUrl) {
    if (!dbSchemaEnsured) {
      await ensureDbSchema().catch(() => {});
    }

    try {
      const rawModel = (rawPrisma as any).product;
      if (rawModel && typeof rawModel[prop] === 'function') {
        const result = await rawModel[prop](...args);
        if (prop === 'create' || prop === 'update' || prop === 'upsert' || prop === 'delete') {
          try {
            const memFn = (memoryHandler as any)[prop];
            if (typeof memFn === 'function') {
              await memFn(...args);
            }
          } catch (_) {}
          try { memoryStore.persistToSnapshot(); } catch (_) {}
        }
        return result;
      }
    } catch (err: any) {
      const errMsg = String(err?.message || err);
      const isMissing = err?.code === 'P2021' || errMsg.includes('does not exist') || errMsg.includes('relation');
      if (isMissing) {
        try {
          await ensureDbSchema();
          const retry = await (rawPrisma as any).product[prop](...args);
          return retry;
        } catch (_) {}
      }
    }
  }

  // Strategy 2: Direct Supabase client if configured
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      if (prop === 'findMany') {
        const { data, error } = await (supabaseAdmin as any).from('products').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }
      } else if (prop === 'findUnique' || prop === 'findFirst') {
        const whereId = args[0]?.where?.id || args[0]?.where?.slug;
        if (whereId) {
          const col = args[0]?.where?.id ? 'id' : 'slug';
          const { data, error } = await (supabaseAdmin as any).from('products').select('*').eq(col, whereId).maybeSingle();
          if (!error && data) return data;
        }
      }
    } catch (_) {}
  }

  // Strategy 3: In-memory store fallback
  const fn = (memoryHandler as any)[prop];
  if (typeof fn === 'function') {
    return fn(...args);
  }
  return null;
}

async function executeResilientOrderQuery(prop: string, args: any[]): Promise<any> {
  const memoryHandler = memoryStore.createModelHandler('order');

  if (hasDatabaseUrl) {
    if (!dbSchemaEnsured) {
      await ensureDbSchema().catch(() => {});
    }

    try {
      const rawModel = (rawPrisma as any).order;
      if (rawModel && typeof rawModel[prop] === 'function') {
        const result = await rawModel[prop](...args);
        if (prop === 'create' || prop === 'update' || prop === 'upsert' || prop === 'delete') {
          try {
            const memFn = (memoryHandler as any)[prop];
            if (typeof memFn === 'function') {
              await memFn(...args);
            }
          } catch (_) {}
          try { memoryStore.persistToSnapshot(); } catch (_) {}
        }
        return result;
      }
    } catch (err: any) {
      const errMsg = String(err?.message || err);
      const isMissing = err?.code === 'P2021' || errMsg.includes('does not exist') || errMsg.includes('relation');
      if (isMissing) {
        try {
          await ensureDbSchema();
          const retry = await (rawPrisma as any).order[prop](...args);
          return retry;
        } catch (_) {}
      }
    }
  }

  // Strategy 2: Direct Supabase client if configured
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      if (prop === 'findMany') {
        const filter = args[0]?.where;
        let query = (supabaseAdmin as any).from('orders').select('*');
        if (filter?.userId) {
          query = query.eq('user_id', filter.userId);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          return data;
        }
      } else if (prop === 'findUnique' || prop === 'findFirst') {
        const whereId = args[0]?.where?.id || args[0]?.where?.orderNumber;
        if (whereId) {
          const col = args[0]?.where?.id ? 'id' : 'order_number';
          const { data, error } = await (supabaseAdmin as any).from('orders').select('*').eq(col, whereId).maybeSingle();
          if (!error && data) return data;
        }
      }
    } catch (_) {}
  }

  // Strategy 3: In-memory store fallback
  const fn = (memoryHandler as any)[prop];
  if (typeof fn === 'function') {
    return fn(...args);
  }
  return null;
}

async function executeResilientCategoryQuery(prop: string, args: any[]): Promise<any> {
  const memoryHandler = memoryStore.createModelHandler('category');

  if (hasDatabaseUrl) {
    if (!dbSchemaEnsured) {
      await ensureDbSchema().catch(() => {});
    }

    try {
      const rawModel = (rawPrisma as any).category;
      if (rawModel && typeof rawModel[prop] === 'function') {
        const result = await rawModel[prop](...args);
        if (prop === 'create' || prop === 'update' || prop === 'upsert' || prop === 'delete') {
          try {
            const memFn = (memoryHandler as any)[prop];
            if (typeof memFn === 'function') {
              await memFn(...args);
            }
          } catch (_) {}
          try { memoryStore.persistToSnapshot(); } catch (_) {}
        }
        return result;
      }
    } catch (err: any) {
      const errMsg = String(err?.message || err);
      const isMissing = err?.code === 'P2021' || errMsg.includes('does not exist') || errMsg.includes('relation');
      if (isMissing) {
        try {
          await ensureDbSchema();
          const retry = await (rawPrisma as any).category[prop](...args);
          return retry;
        } catch (_) {}
      }
    }
  }

  const fn = (memoryHandler as any)[prop];
  if (typeof fn === 'function') {
    return fn(...args);
  }
  return null;
}

function createModelProxy(modelName: string | symbol) {
  if (typeof modelName !== 'string') {
    return undefined;
  }
  const memoryHandler = memoryStore.createModelHandler(modelName);

  return new Proxy({}, {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') {
        return undefined;
      }
      return async (...args: any[]) => {
        // High resilience routing for custom orders and reviews
        if (modelName === 'customOrder') {
          return executeResilientCustomOrderQuery(prop, args);
        }
        if (modelName === 'customOrderReview') {
          return executeResilientCustomOrderReviewQuery(prop, args);
        }
        if (modelName === 'product') {
          return executeResilientProductQuery(prop, args);
        }
        if (modelName === 'order') {
          return executeResilientOrderQuery(prop, args);
        }
        if (modelName === 'category') {
          return executeResilientCategoryQuery(prop, args);
        }

        if (!hasDatabaseUrl) {
          const fn = (memoryHandler as any)[prop];
          if (typeof fn === 'function') {
            return fn(...args);
          }
          return null;
        }

        const rawModel = (rawPrisma as any)[modelName];
        if (!rawModel || typeof rawModel[prop] !== 'function') {
          // If the model does not exist on Prisma client, fallback to memory store
          const fn = (memoryHandler as any)[prop];
          if (typeof fn === 'function') {
            return fn(...args);
          }
          throw new Error(`Method '${prop}' does not exist on Prisma model '${modelName}'.`);
        }

        const backoffs = [250, 500, 1000];
        let lastError: any;

        for (let attempt = 0; attempt <= backoffs.length; attempt++) {
          try {
            return await rawModel[prop](...args);
          } catch (err: any) {
            lastError = err;
            const queryName = `${modelName}.${prop}`;
            const errorMessage = err?.message || String(err);
            const timestamp = new Date().toISOString();

            // Check if table is missing in database (Prisma P2021 or Postgres relation does not exist)
            const isTableMissing =
              err?.code === 'P2021' ||
              errorMessage.toLowerCase().includes('does not exist') ||
              (errorMessage.toLowerCase().includes('relation') && errorMessage.toLowerCase().includes('does not exist'));

            if (isTableMissing) {
              console.warn(`[${timestamp}] Table for model '${modelName}' is missing in database. Attempting auto-creation...`);
              try {
                await ensureDbSchema();
                return await rawModel[prop](...args);
              } catch (retryErr: any) {
                console.warn(`[${timestamp}] Auto-creation failed or query retry failed: ${retryErr?.message}. Falling back to memory store for ${queryName}.`);
                const fn = (memoryHandler as any)[prop];
                if (typeof fn === 'function') {
                  return fn(...args);
                }
              }
            }

            // Check if database server is unreachable, connection refused, or timed out
            const isDbConnectionFailure =
              err?.name === 'PrismaClientInitializationError' ||
              err?.name === 'PrismaClientRustPanicError' ||
              (typeof err?.code === 'string' && (err.code.startsWith('P1') || err.code === 'P2021')) ||
              errorMessage.toLowerCase().includes("can't reach database server") ||
              errorMessage.toLowerCase().includes('connection refused') ||
              errorMessage.toLowerCase().includes('connection terminated') ||
              errorMessage.toLowerCase().includes('connection timeout') ||
              errorMessage.toLowerCase().includes('timed out') ||
              errorMessage.toLowerCase().includes('database does not exist') ||
              errorMessage.toLowerCase().includes('authentication failed');

            if (isDbConnectionFailure) {
              console.warn(`[${timestamp}] Database connection failure in ${queryName}: ${errorMessage}. Serving from high-resilience memory store.`);
              const fn = (memoryHandler as any)[prop];
              if (typeof fn === 'function') {
                return fn(...args);
              }
            }

            // Do not retry on deterministic request / validation / constraint errors
            const isNonRetryable =
              err?.name === 'PrismaClientKnownRequestError' ||
              err?.name === 'PrismaClientValidationError' ||
              (typeof err?.code === 'string' && err.code.startsWith('P2'));

            if (isNonRetryable) {
              throw err;
            }

            if (attempt < backoffs.length) {
              const retryNumber = attempt + 1;
              const delay = backoffs[attempt];
              console.error(
                `[${timestamp}] Prisma Query Error in ${queryName} | Retry Number: ${retryNumber}/3 | Delay: ${delay}ms | Error: ${errorMessage}`
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
              console.error(
                `[${timestamp}] Prisma Query Max Retries Reached for ${queryName} | Final Error: ${errorMessage}`
              );
            }
          }
        }

        // Final fallback: If remote database query failed completely, serve from memory store
        const fallbackFn = (memoryHandler as any)[prop];
        if (typeof fallbackFn === 'function') {
          console.warn(`[${new Date().toISOString()}] Failover triggered for ${modelName}.${prop}. Serving from in-memory fallback store.`);
          return fallbackFn(...args);
        }

        throw lastError;
      };
    }
  });
}

export const prisma = new Proxy(rawPrisma, {
  get(target, prop: string | symbol) {
    if (typeof prop === 'symbol') {
      return (target as any)[prop];
    }
    if (prop === '$connect' || prop === '$disconnect') {
      return async () => {};
    }
    if (prop === '$transaction') {
      return async (cbOrArray: any) => {
        if (!hasDatabaseUrl) {
          const snapshot = memoryStore.snapshot();
          if (typeof cbOrArray === 'function') {
            try {
              return await cbOrArray(prisma);
            } catch (err) {
              memoryStore.restore(snapshot);
              throw err;
            }
          }
          if (Array.isArray(cbOrArray)) {
            try {
              return await Promise.all(cbOrArray);
            } catch (err) {
              memoryStore.restore(snapshot);
              throw err;
            }
          }
          return null;
        }
        if (typeof cbOrArray === 'function') {
          return rawPrisma.$transaction(async (rawTx: any) => {
            return cbOrArray(rawTx);
          });
        }
        return rawPrisma.$transaction(cbOrArray);
      };
    }
    if (prop in target && typeof (target as any)[prop] === 'function') {
      return (...args: any[]) => {
        if (!hasDatabaseUrl) {
          return null;
        }
        return (target as any)[prop](...args);
      };
    }
    return createModelProxy(prop);
  }
}) as PrismaClient;

export default prisma;

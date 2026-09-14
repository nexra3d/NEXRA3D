-- ============================================================================
-- Migration: Add Performance Indexes for Frequent Filter & Search Queries
-- Target: Supabase / PostgreSQL
-- ============================================================================

-- 1. Orders: High-frequency payment verification, courier tracking, and sorting
CREATE INDEX IF NOT EXISTS "orders_razorpayOrderId_idx" ON "orders"("razorpayOrderId");
CREATE INDEX IF NOT EXISTS "orders_awbNumber_idx" ON "orders"("awbNumber");
CREATE INDEX IF NOT EXISTS "orders_trackingNumber_idx" ON "orders"("trackingNumber");
CREATE INDEX IF NOT EXISTS "orders_shipmentId_idx" ON "orders"("shipmentId");
CREATE INDEX IF NOT EXISTS "orders_paymentStatus_idx" ON "orders"("paymentStatus");
CREATE INDEX IF NOT EXISTS "orders_userId_paymentStatus_idx" ON "orders"("userId", "paymentStatus");
CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt" DESC);

-- 2. Order Items: Filter by variant ID
CREATE INDEX IF NOT EXISTS "order_items_variantId_idx" ON "order_items"("variantId");

-- 3. Custom Orders: Payment gateway verification and timestamp sorting
CREATE INDEX IF NOT EXISTS "custom_orders_razorpayOrderId_idx" ON "custom_orders"("razorpayOrderId");
CREATE INDEX IF NOT EXISTS "custom_orders_razorpayQrId_idx" ON "custom_orders"("razorpayQrId");
CREATE INDEX IF NOT EXISTS "custom_orders_createdAt_idx" ON "custom_orders"("createdAt" DESC);

-- 4. Custom Order Reviews: Public gallery showcase filtering and admin status
CREATE INDEX IF NOT EXISTS "custom_order_reviews_isApproved_createdAt_idx" ON "custom_order_reviews"("isApproved", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "custom_order_reviews_status_idx" ON "custom_order_reviews"("status");

-- 5. Addresses: Composite index for instant default address lookup
CREATE INDEX IF NOT EXISTS "addresses_userId_isDefault_idx" ON "addresses"("userId", "isDefault");

-- 6. Email Verification OTPs: Active OTP validation lookup
CREATE INDEX IF NOT EXISTS "email_verification_otps_lookup_idx" ON "email_verification_otps"("email", "usedAt", "expiresAt");

-- 7. Users: Account search by phone number
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users"("phone");

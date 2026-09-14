import { PGlite } from '@electric-sql/pglite';

async function runBenchmark() {
  const db = new PGlite();

  console.log('--- Initializing Schema ---');
  await db.exec(`
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED');
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COD');

    CREATE TABLE "users" (
      "id" TEXT PRIMARY KEY,
      "email" TEXT UNIQUE NOT NULL,
      "phone" TEXT,
      "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "users_email_idx" ON "users"("email");
    CREATE INDEX "users_role_idx" ON "users"("role");

    CREATE TABLE "orders" (
      "id" TEXT PRIMARY KEY,
      "orderNumber" TEXT UNIQUE NOT NULL,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
      "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
      "paymentMethod" TEXT NOT NULL DEFAULT 'RAZORPAY',
      "razorpayOrderId" TEXT,
      "razorpayPaymentId" TEXT,
      "awbNumber" TEXT,
      "trackingNumber" TEXT,
      "shipmentId" TEXT,
      "shipmentStatus" TEXT,
      "totalAmount" NUMERIC(10,2) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    -- Existing Prisma indexes:
    CREATE INDEX "orders_userId_idx" ON "orders"("userId");
    CREATE INDEX "orders_orderNumber_idx" ON "orders"("orderNumber");
    CREATE INDEX "orders_status_idx" ON "orders"("status");

    CREATE TABLE "custom_orders" (
      "id" TEXT PRIMARY KEY,
      "customerName" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "email" TEXT,
      "amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
      "paymentStatus" TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
      "razorpayOrderId" TEXT,
      "razorpayQrId" TEXT,
      "isPublic" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    -- Existing Prisma / migration indexes:
    CREATE INDEX "custom_orders_phone_idx" ON "custom_orders"("phone");
    CREATE INDEX "custom_orders_paymentStatus_idx" ON "custom_orders"("paymentStatus");
    CREATE INDEX "custom_orders_isPublic_idx" ON "custom_orders"("isPublic");

    CREATE TABLE "custom_order_reviews" (
      "id" TEXT PRIMARY KEY,
      "customOrderId" TEXT NOT NULL,
      "userName" TEXT,
      "rating" INTEGER NOT NULL DEFAULT 5,
      "comment" TEXT NOT NULL,
      "isApproved" BOOLEAN NOT NULL DEFAULT true,
      "status" TEXT NOT NULL DEFAULT 'APPROVED',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "custom_order_reviews_customOrderId_idx" ON "custom_order_reviews"("customOrderId");

    CREATE TABLE "addresses" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "addressLine1" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "addresses_userId_idx" ON "addresses"("userId");
  `);

  console.log('--- Seeding Realistic Dataset ---');
  await db.exec(`
    INSERT INTO "users" ("id", "email", "phone", "role", "createdAt")
    SELECT
      'usr_' || i,
      'user' || i || '@example.com',
      '+9198765' || LPAD(i::text, 5, '0'),
      CASE WHEN i % 10 = 0 THEN 'ADMIN' ELSE 'CUSTOMER' END,
      NOW() - (i || ' hours')::interval
    FROM generate_series(1, 500) AS i;

    INSERT INTO "orders" ("id", "orderNumber", "userId", "status", "paymentStatus", "razorpayOrderId", "awbNumber", "trackingNumber", "shipmentId", "totalAmount", "createdAt")
    SELECT
      'ord_' || i,
      'ORD-2026-' || LPAD(i::text, 6, '0'),
      'usr_' || ((i % 500) + 1),
      (ARRAY['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']::"OrderStatus"[])[(i % 6) + 1],
      (ARRAY['PENDING', 'PAID', 'FAILED', 'COD']::"PaymentStatus"[])[(i % 4) + 1],
      CASE WHEN i % 2 = 0 THEN 'order_rzp_' || i ELSE NULL END,
      CASE WHEN i % 3 = 0 THEN '1431202' || LPAD(i::text, 6, '0') ELSE NULL END,
      CASE WHEN i % 3 = 0 THEN 'TRK-' || LPAD(i::text, 6, '0') ELSE NULL END,
      CASE WHEN i % 3 = 0 THEN 'SHP-' || LPAD(i::text, 6, '0') ELSE NULL END,
      (500 + (i % 5000))::numeric,
      NOW() - (i || ' minutes')::interval
    FROM generate_series(1, 10000) AS i;

    INSERT INTO "custom_orders" ("id", "customerName", "phone", "email", "amount", "paymentStatus", "razorpayOrderId", "razorpayQrId", "isPublic", "createdAt")
    SELECT
      'co_' || i,
      'Customer ' || i,
      '+9198765' || LPAD((i % 500)::text, 5, '0'),
      'cust' || i || '@example.com',
      (1200 + (i % 3000))::numeric,
      (ARRAY['AWAITING_PAYMENT', 'PAID', 'CANCELLED', 'EXPIRED'])[(i % 4) + 1],
      'order_co_rzp_' || i,
      'qr_' || i,
      (i % 5 = 0),
      NOW() - (i || ' minutes')::interval
    FROM generate_series(1, 2000) AS i;

    INSERT INTO "custom_order_reviews" ("id", "customOrderId", "userName", "rating", "comment", "isApproved", "createdAt")
    SELECT
      'cor_' || i,
      'co_' || ((i % 500) + 1),
      'Reviewer ' || i,
      (i % 5) + 1,
      'Great print quality for order ' || i,
      (i % 10 != 0),
      NOW() - (i || ' minutes')::interval
    FROM generate_series(1, 2000) AS i;

    INSERT INTO "addresses" ("id", "userId", "isDefault", "addressLine1", "createdAt")
    SELECT
      'addr_' || i,
      'usr_' || ((i % 500) + 1),
      (i % 3 = 0),
      'Address street ' || i,
      NOW() - (i || ' minutes')::interval
    FROM generate_series(1, 1500) AS i;

    ANALYZE;
  `);

  const testCases = [
    {
      id: 'case_1',
      title: 'Query 1: Razorpay Order Verification (orders by razorpayOrderId)',
      sql: `SELECT id, "orderNumber", "paymentStatus", "totalAmount" FROM "orders" WHERE "razorpayOrderId" = 'order_rzp_8452';`
    },
    {
      id: 'case_2',
      title: 'Query 2: Courier / Delhivery Sync & Webhook (orders by awbNumber)',
      sql: `SELECT id, "orderNumber", "status", "awbNumber" FROM "orders" WHERE "awbNumber" = '1431202008451';`
    },
    {
      id: 'case_3',
      title: 'Query 3: Checkout Pending Order Resolution (orders by userId + paymentStatus, sorted by createdAt DESC)',
      sql: `SELECT id, "totalAmount", "createdAt" FROM "orders" WHERE "userId" = 'usr_42' AND "paymentStatus" = 'PENDING' ORDER BY "createdAt" DESC LIMIT 1;`
    },
    {
      id: 'case_4',
      title: 'Query 4: Admin Recent Orders Dashboard (orders sorted by createdAt DESC)',
      sql: `SELECT id, "orderNumber", "totalAmount", "status", "createdAt" FROM "orders" ORDER BY "createdAt" DESC LIMIT 20;`
    },
    {
      id: 'case_5',
      title: 'Query 5: Custom Order Payment Status Verification (custom_orders by razorpayOrderId)',
      sql: `SELECT id, "customerName", "paymentStatus", "amount" FROM "custom_orders" WHERE "razorpayOrderId" = 'order_co_rzp_1200';`
    },
    {
      id: 'case_6',
      title: 'Query 6: Public Gallery Showcase (custom_order_reviews by isApproved, sorted by createdAt DESC)',
      sql: `SELECT id, "customOrderId", "userName", "rating", "comment", "createdAt" FROM "custom_order_reviews" WHERE "isApproved" = true ORDER BY "createdAt" DESC LIMIT 20;`
    },
    {
      id: 'case_7',
      title: 'Query 7: User Default Address Lookup (addresses by userId + isDefault)',
      sql: `SELECT id, "addressLine1" FROM "addresses" WHERE "userId" = 'usr_150' AND "isDefault" = true LIMIT 1;`
    }
  ];

  const results: any = {};

  console.log('\n================== RUNNING BEFORE PLANS ==================');
  for (const tc of testCases) {
    const res = await db.query(`EXPLAIN (ANALYZE, BUFFERS) ${tc.sql}`);
    const plan = res.rows.map(r => r['QUERY PLAN']).join('\n');
    results[tc.id] = { title: tc.title, sql: tc.sql, before: plan };
  }

  console.log('\n================== APPLYING INDEX MIGRATION ==================');
  const migrationSql = `
    -- 1. Index on orders(razorpayOrderId) for O(1) payment verification & webhooks
    CREATE INDEX IF NOT EXISTS "orders_razorpayOrderId_idx" ON "orders"("razorpayOrderId");

    -- 2. Indexes on shipping identifiers for high-throughput tracking & webhooks
    CREATE INDEX IF NOT EXISTS "orders_awbNumber_idx" ON "orders"("awbNumber");
    CREATE INDEX IF NOT EXISTS "orders_trackingNumber_idx" ON "orders"("trackingNumber");
    CREATE INDEX IF NOT EXISTS "orders_shipmentId_idx" ON "orders"("shipmentId");

    -- 3. Composite index on orders(userId, paymentStatus, createdAt DESC) for checkout session resolution
    CREATE INDEX IF NOT EXISTS "orders_userId_paymentStatus_createdAt_idx" ON "orders"("userId", "paymentStatus", "createdAt" DESC);

    -- 4. Index on orders(createdAt DESC) for fast admin/customer pagination without table sorting
    CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt" DESC);

    -- 5. Index on custom_orders(razorpayOrderId) and custom_orders(razorpayQrId)
    CREATE INDEX IF NOT EXISTS "custom_orders_razorpayOrderId_idx" ON "custom_orders"("razorpayOrderId");
    CREATE INDEX IF NOT EXISTS "custom_orders_razorpayQrId_idx" ON "custom_orders"("razorpayQrId");
    CREATE INDEX IF NOT EXISTS "custom_orders_createdAt_idx" ON "custom_orders"("createdAt" DESC);

    -- 6. Composite index on custom_order_reviews(isApproved, createdAt DESC) for the public showcase
    CREATE INDEX IF NOT EXISTS "custom_order_reviews_isApproved_createdAt_idx" ON "custom_order_reviews"("isApproved", "createdAt" DESC);

    -- 7. Composite index on addresses(userId, isDefault) for default address resolution
    CREATE INDEX IF NOT EXISTS "addresses_userId_isDefault_idx" ON "addresses"("userId", "isDefault");

    ANALYZE;
  `;
  await db.exec(migrationSql);

  console.log('\n================== RUNNING AFTER PLANS ==================');
  for (const tc of testCases) {
    const res = await db.query(`EXPLAIN (ANALYZE, BUFFERS) ${tc.sql}`);
    const plan = res.rows.map(r => r['QUERY PLAN']).join('\n');
    results[tc.id].after = plan;
  }

  console.log('\n### SUMMARY_JSON_OUTPUT_START ###');
  console.log(JSON.stringify(results, null, 2));
  console.log('### SUMMARY_JSON_OUTPUT_END ###');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});

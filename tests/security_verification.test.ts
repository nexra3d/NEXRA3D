import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../app';
import { prisma } from '../src/lib/prisma';
import {
  revokeToken,
  isTokenRevoked,
  validateJwtSecretInProduction,
  validateRasterImageBuffer
} from '../src/lib/authSecurity';
import { verifyRazorpayWebhookSignature } from '../src/lib/razorpayCustomOrder';
import { formatDelhiveryHeaders } from '../src/lib/shipping/delhivery';

describe('NEXRA 3D — Post-Hardening Security Verification & Remediation Audit', () => {
  let adminToken = '';
  let customerAToken = '';
  let customerBToken = '';
  let customerAId = '';
  let customerBId = '';
  let orderCustomerAId = '';
  let orderCustomerBId = '';

  const validJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43
  ]);

  beforeAll(async () => {
    // 1. Create Admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'SecOps Admin',
        email: `secops_admin_${Date.now()}@nexra3d.in`,
        password: 'AdminPassword123!Secure'
      });
    adminToken = adminRes.body.token;

    // 2. Create Customer A
    const custARes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Customer',
        email: `alice_${Date.now()}@example.com`,
        password: 'AlicePassword123!'
      });
    customerAToken = custARes.body.token;
    customerAId = custARes.body.user?.id;

    // 3. Create Customer B
    const custBRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Bob Customer',
        email: `bob_${Date.now()}@example.com`,
        password: 'BobPassword123!'
      });
    customerBToken = custBRes.body.token;
    customerBId = custBRes.body.user?.id;

    // 4. Create Order for Customer A
    const orderA = await prisma.order.create({
      data: {
        orderNumber: `ORD-A-${Date.now()}`,
        userId: customerAId,
        shippingAddress: {
          customerName: 'Alice Customer',
          customerEmail: 'alice@example.com',
          customerPhone: '+91 9876543210',
          streetAddress: '123 Secret Villa Road',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500032',
          country: 'India'
        },
        subtotal: 1000,
        totalAmount: 1000,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'RAZORPAY',
        razorpayOrderId: `order_sec_a_${Date.now()}`
      }
    });
    orderCustomerAId = orderA.id;

    // 5. Create Order for Customer B
    const orderB = await prisma.order.create({
      data: {
        orderNumber: `ORD-B-${Date.now()}`,
        userId: customerBId,
        shippingAddress: {
          customerName: 'Bob Customer',
          customerEmail: 'bob@example.com',
          customerPhone: '+91 9123456780',
          streetAddress: '456 Bob Private Lane',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560001',
          country: 'India'
        },
        subtotal: 2000,
        totalAmount: 2000,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'RAZORPAY',
        razorpayOrderId: `order_sec_b_${Date.now()}`
      }
    });
    orderCustomerBId = orderB.id;
  });

  describe('1. JWT Validation, Production Startup & Server-Side Token Revocation', () => {
    it('Should reject weak or default JWT secrets in production', () => {
      expect(() => validateJwtSecretInProduction('change_this_secret_in_production')).toThrow();
      expect(() => validateJwtSecretInProduction('short')).toThrow();
      expect(() => validateJwtSecretInProduction('secret123456789012345678901234567890')).not.toThrow();
    });

    it('Should invalidate token on logout and reject subsequent requests', async () => {
      // 1. Create a temporary user token
      const tempRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Logout Test User',
          email: `temp_logout_${Date.now()}@example.com`,
          password: 'Password123!Secure'
        });
      const tempToken = tempRes.body.token;
      expect(tempToken).toBeDefined();

      // 2. Can access protected endpoint before logout
      const beforeLogout = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(beforeLogout.status).toBe(200);

      // 3. Perform logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(logoutRes.status).toBe(200);
      expect(isTokenRevoked(tempToken)).toBe(true);

      // 4. Request after logout MUST be rejected with 401 Unauthorized
      const afterLogout = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(afterLogout.status).toBe(401);
    });
  });

  describe('2. Customer Cart/Order Ownership & IDOR Protection', () => {
    it('Customer A cannot view Customer B’s cart items', async () => {
      // Customer B adds item to cart
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({
          productId: 'prod-spiral-ambient-lamp',
          quantity: 2
        });

      // Customer A queries cart
      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      // Customer A must not see Customer B's cart items
      const hasCustBItems = res.body.items?.some((i: any) => i.userId === customerBId);
      expect(hasCustBItems).toBeFalsy();
    });

    it('Customer A cannot update Customer B’s order status (IDOR prevention)', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderCustomerBId}/status`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(403);
    });

    it('Customer cannot escalate privileges by marking own order as PAID or CONFIRMED', async () => {
      // Alice tries to mark her own order as PAID
      const res = await request(app)
        .put(`/api/orders/${orderCustomerAId}/status`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ paymentStatus: 'PAID' });

      expect(res.status).toBe(403);

      // Alice tries to mark her own order as DELIVERED
      const res2 = await request(app)
        .put(`/api/orders/${orderCustomerAId}/status`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ status: 'DELIVERED' });

      expect(res2.status).toBe(403);
    });

    it('Customer A cannot mark failure or retry payment for Customer B’s order', async () => {
      // Payment fail IDOR test
      const failRes = await request(app)
        .post('/api/payments/razorpay/fail')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ orderId: orderCustomerBId });

      expect(failRes.status).toBe(403);

      // Payment retry IDOR test
      const retryRes = await request(app)
        .post(`/api/orders/${orderCustomerBId}/retry-payment`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(retryRes.status).toBe(403);
    });
  });

  describe('3. Administrator-Only Access for Internal Operations', () => {
    it('Blocks non-admin from creating shipments', async () => {
      const res = await request(app)
        .post('/api/shipping/create')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({});

      expect(res.status).toBe(403);

      const res2 = await request(app)
        .post(`/api/admin/orders/${orderCustomerAId}/shipments`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({});

      expect(res2.status).toBe(403);
    });

    it('Blocks non-admin from shipping manifest, pickup, and diagnostics', async () => {
      const manifestRes = await request(app)
        .get('/api/shipping/manifest/dummy-awb-123')
        .set('Authorization', `Bearer ${customerAToken}`);
      expect(manifestRes.status).toBe(403);

      const pickupRes = await request(app)
        .post('/api/shipping/pickup')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({});
      expect(pickupRes.status).toBe(403);

      const diagRes = await request(app)
        .get('/api/shipping/diagnostics')
        .set('Authorization', `Bearer ${customerAToken}`);
      expect(diagRes.status).toBe(403);
    });

    it('Blocks non-admin from accessing transactional email operations', async () => {
      const res = await request(app)
        .get('/api/emails')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(403);
    });

    it('Blocks non-admin from database diagnostics endpoint (/api/db-test)', async () => {
      const res = await request(app)
        .get('/api/db-test')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('4. Razorpay Webhook & Signature Verification Security', () => {
    it('Rejects forged or missing Razorpay webhook signature', async () => {
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_fraud123',
              order_id: 'order_nonexistent'
            }
          }
        }
      };

      const res = await request(app)
        .post('/api/payments/razorpay/webhook')
        .set('x-razorpay-signature', 'forged_fake_signature_1234567890abcdef')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid webhook signature/i);
    });

    it('Verifies legitimate Razorpay webhook signature with timingSafeEqual', () => {
      const secret = 'test_webhook_secret_key_32_characters_long';
      const rawBody = JSON.stringify({ event: 'payment.captured' });
      const validSig = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      const isSigValid = verifyRazorpayWebhookSignature(rawBody, validSig, secret);
      expect(isSigValid).toBe(true);

      const isForgedValid = verifyRazorpayWebhookSignature(rawBody, 'deadbeef1234567890abcdef', secret);
      expect(isForgedValid).toBe(false);
    });
  });

  describe('5. Raster-Image Validation, Magic Bytes & Upload Protections', () => {
    it('Blocks vector SVG disguised with .jpg extension', () => {
      const svgPayload = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      const res = validateRasterImageBuffer(svgPayload);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/Vector images \(SVG\) and active scripts are strictly forbidden/i);
    });

    it('Blocks HTML/JS polyglot file masquerading as image', () => {
      const polyglot = Buffer.from('<html><head><script>alert("xss")</script></head><body>fake image</body></html>');
      const res = validateRasterImageBuffer(polyglot);
      expect(res.valid).toBe(false);
    });

    it('Rejects files with invalid magic bytes', () => {
      const fakeBytes = Buffer.from('random string of characters without headers');
      const res = validateRasterImageBuffer(fakeBytes);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/allowed raster image format|unsupported|invalid/i);
    });

    it('Accepts genuine JPEG raster image buffer', () => {
      const res = validateRasterImageBuffer(validJpeg);
      expect(res.valid).toBe(true);
    });

    it('Upload endpoint rejects non-raster file uploads', async () => {
      const res = await request(app)
        .post('/api/customization/upload')
        .set('Authorization', `Bearer ${customerAToken}`)
        .field('productId', 'prod-lithophane-moon-lamp')
        .field('currentCount', '0')
        .attach('images', Buffer.from('<svg><circle r="10"/></svg>'), 'malicious.jpg');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('6. CORS, Security Headers, & Privacy PII Protection', () => {
    it('Rejects cross-origin preflight from unauthorized origins', async () => {
      const res = await request(app)
        .options('/api/products')
        .set('Origin', 'https://malicious-attacker-site.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBe(403);
    });

    it('Public tracking endpoint sanitizes customer PII for unauthenticated callers', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderCustomerAId}/track`);

      expect(res.status).toBe(200);
      // PII must be stripped or masked:
      expect(res.body.order?.customerPhone).toBeNull();
      expect(res.body.order?.customerEmail).toBeNull();
      expect(res.body.order?.shippingAddress?.streetAddress).toBeUndefined();
      expect(res.body.order?.customerName).toBe('Customer');
      // City/State/PIN are retained for tracking visibility:
      expect(res.body.order?.shippingAddress?.city).toBe('Hyderabad');
    });

    it('FormatDelhiveryHeaders completely redacts token and authorization headers', () => {
      const headers = {
        Authorization: 'Token secret_delhivery_api_token_12345',
        'X-API-Key': 'confidential_key_abcdef',
        'Content-Type': 'application/json'
      };

      const sanitized = formatDelhiveryHeaders(headers);
      expect(sanitized.Authorization).toBe('Token ****');
      expect(sanitized['X-API-Key']).toBe('****');
      expect(sanitized['Content-Type']).toBe('application/json');
    });
  });
});

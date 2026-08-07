import { NextRequest } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/utils/api";
import { z } from "zod";

const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  razorpay_order_id: z.string().min(1, "Razorpay Order ID is required"),
  razorpay_payment_id: z.string().min(1, "Razorpay Payment ID is required"),
  razorpay_signature: z.string().min(1, "Razorpay Signature is required"),
});

/**
 * POST /api/payments/verify
 * HMAC-SHA256 Signature Verification Endpoint for Razorpay
 * - Strict server-side crypto validation over `razorpay_order_id|razorpay_payment_id`
 * - Idempotency checks to prevent replay attacks or duplicate processing
 * - Atomic database status updates for Payment & Order records
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Session Authentication
    const session = await auth();
    if (!session || !session.user?.id) {
      return apiError("Unauthorized. Authentication required to verify payment.", 401);
    }

    // 2. Validate Payload Schema
    const body = await request.json();
    const validated = verifyPaymentSchema.safeParse(body);

    if (!validated.success) {
      return apiError("Invalid payment verification payload.", 400);
    }

    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = validated.data;

    // 3. Fetch Order & Payment from DB
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      include: {
        payment: true,
      },
    });

    if (!order) {
      return apiError("Order record not found.", 404);
    }

    // 4. Idempotency Check — Prevent duplicate payment processing
    if (order.paymentStatus === "PAID" && order.payment?.status === "PAID") {
      return apiSuccess({
        verified: true,
        idempotent: true,
        message: "Order has already been verified and marked as PAID.",
        paymentId: order.payment?.providerPaymentId || razorpay_payment_id,
      });
    }

    // 5. Fetch Server Secret for HMAC Verification
    const keySecretSetting = await db.systemSetting.findUnique({
      where: { key: "RAZORPAY_KEY_SECRET" },
    });

    const keySecret =
      keySecretSetting?.value ||
      process.env.RAZORPAY_KEY_SECRET ||
      process.env.RAZORPAY_SECRET ||
      "";

    // 6. HMAC-SHA256 Signature Verification
    if (keySecret) {
      const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(payload)
        .digest("hex");

      const isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf-8"),
        Buffer.from(razorpay_signature, "utf-8")
      );

      if (!isSignatureValid) {
        console.warn(`[Payment Security Alert] Invalid HMAC signature for Order ${orderId}`);
        
        await db.payment.update({
          where: { orderId },
          data: {
            status: "FAILED",
            failureReason: "HMAC-SHA256 signature mismatch",
          },
        });

        return apiError("Payment signature verification failed. Untrusted response.", 400);
      }
    } else {
      console.warn(
        `[Payment Warning] RAZORPAY_KEY_SECRET not set. Skipping HMAC verification for mock order ${orderId}`
      );
    }

    // 7. Atomic Database Mutation
    await db.$transaction([
      db.payment.upsert({
        where: { orderId },
        create: {
          orderId,
          provider: keySecret ? "RAZORPAY" : "MOCK",
          providerOrderId: razorpay_order_id,
          providerPaymentId: razorpay_payment_id,
          providerSignature: razorpay_signature,
          status: "PAID",
          amount: order.totalAmount,
          currency: "INR",
          paidAt: new Date(),
        },
        update: {
          status: "PAID",
          providerPaymentId: razorpay_payment_id,
          providerSignature: razorpay_signature,
          paidAt: new Date(),
        },
      }),
      db.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
        },
      }),
    ]);

    return apiSuccess({
      verified: true,
      idempotent: false,
      message: "Payment verified successfully.",
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error("[API Payments Verify POST]", error);
    return apiError(
      error instanceof Error ? error.message : "Payment verification failed",
      500
    );
  }
}

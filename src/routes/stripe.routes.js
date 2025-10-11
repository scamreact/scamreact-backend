const express = require("express");
const router = express.Router();

// Controllers
const paymentController = require("../controllers/payment.controller");
const hostController = require("../controllers/host.stripe.controller");
const webhookController = require("../controllers/webhook.controller");

// Middleware
const {
  validatePaymentData,
  validateHostData,
  verifyStripeWebhook,
} = require("../middleware/stripe.middleware");

// PAYMENT ROUTES

// Crea Payment Intent con Destination Charges
router.post(
  "/create-payment-intent",
  validatePaymentData,
  paymentController.createPaymentIntent
);

// Crea Payment Intent per transfer manuali
router.post(
  "/create-payment-intent-manual",
  validatePaymentData,
  paymentController.createPaymentIntentManual
);

// Transfer manuale all'host
router.post("/manual-transfer", paymentController.manualTransfer);

// HOST ROUTES

// Onboarding host
router.post("/onboard-host", validateHostData, hostController.onboardHost);

// Verifica stato host
router.get("/host-status/:host_id", hostController.getHostStatus);

// WEBHOOK ROUTE

// Webhook Stripe (usa raw body parser)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  verifyStripeWebhook,
  webhookController.handleWebhook
);

module.exports = router;

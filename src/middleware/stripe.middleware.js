const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * Middleware per verificare la firma dei webhook Stripe
 */
const verifyStripeWebhook = (req, res, next) => {
  const sig = req.headers["stripe-signature"];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    req.stripeEvent = event;
    next();
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).send("Webhook signature verification failed.");
  }
};

/**
 * Middleware per validare i dati di pagamento
 */
const validatePaymentData = (req, res, next) => {
  const { amount, listing_id, host_id, booking_data, customer_email } =
    req.body;

  if (!amount || !listing_id || !host_id || !booking_data || !customer_email) {
    return res.status(400).json({ error: "Dati mancanti" });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: "Importo non valido" });
  }

  if (!customer_email.includes("@")) {
    return res.status(400).json({ error: "Email non valida" });
  }

  next();
};

/**
 * Middleware per validare i dati di onboarding host
 */
const validateHostData = (req, res, next) => {
  const { host_email, host_id } = req.body;

  if (!host_email || !host_id) {
    return res.status(400).json({ error: "Email e ID host richiesti" });
  }

  if (!host_email.includes("@")) {
    return res.status(400).json({ error: "Email non valida" });
  }

  next();
};

module.exports = {
  verifyStripeWebhook,
  validatePaymentData,
  validateHostData,
};

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const db = require("../database/db");
const {
  calculateFees,
  createPaymentMetadata,
  sendConfirmationEmail,
  sendPaymentFailureEmail,
} = require("../utils/payments/stripe.utils");

/**
 * Crea Payment Intent con Destination Charges (raccomandato)
 */
const createPaymentIntent = async (req, res) => {
  try {
    const { amount, listing_id, host_id, booking_data, customer_email } =
      req.body;

    // Recupera account Stripe dell'host
    const hostStripeAccount = await db.getHostStripeAccount(host_id);
    if (!hostStripeAccount) {
      return res.status(400).json({
        error: "Host non configurato per pagamenti",
      });
    }

    // Calcola commissioni
    const fees = calculateFees(amount);

    // Crea metadati
    const metadata = createPaymentMetadata(
      listing_id,
      host_id,
      booking_data,
      customer_email,
      fees
    );

    // Crea Payment Intent con Destination Charges
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "eur",
      application_fee_amount: fees.platformFee,
      transfer_data: {
        destination: hostStripeAccount,
      },
      metadata,
      receipt_email: customer_email,
      description: `Prenotazione B&B ${listing_id}`,
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount_breakdown: fees,
    });
  } catch (error) {
    console.error("Payment Intent creation failed:", error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Crea Payment Intent per transfer manuali
 */
const createPaymentIntentManual = async (req, res) => {
  try {
    const { amount, listing_id, host_id, booking_data, customer_email } =
      req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "eur",
      metadata: {
        listing_id,
        host_id,
        checkin: booking_data.checkin,
        checkout: booking_data.checkout,
        guests: booking_data.guests.toString(),
        customer_email,
      },
      receipt_email: customer_email,
      description: `Prenotazione B&B ${listing_id}`,
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (error) {
    console.error("Payment Intent creation failed:", error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Esegue transfer manuale all'host
 */
const manualTransfer = async (req, res) => {
  try {
    const { payment_intent_id, host_id } = req.body;

    // Recupera PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(
      payment_intent_id
    );

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ error: "Payment non completato" });
    }

    // Calcola importo host
    const fees = calculateFees(paymentIntent.amount);

    // Recupera account host
    const hostStripeAccount = await db.getHostStripeAccount(host_id);

    // Crea transfer
    const transfer = await stripe.transfers.create({
      amount: fees.hostAmount,
      currency: "eur",
      destination: hostStripeAccount,
      description: `Payout per prenotazione ${payment_intent_id}`,
      metadata: {
        payment_intent_id,
        host_id,
        listing_id: paymentIntent.metadata.listing_id,
      },
    });

    res.json({
      transfer_id: transfer.id,
      amount_transferred: fees.hostAmount,
      platform_fee: fees.platformFee,
    });
  } catch (error) {
    console.error("Manual transfer failed:", error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createPaymentIntent,
  createPaymentIntentManual,
  manualTransfer,
};

const db = require("../database/db");
const {
  sendConfirmationEmail,
  sendPaymentFailureEmail,
} = require("../utils/payments/stripe.utils");

/*** Gestisce gli eventi webhook di Stripe */
const handleWebhook = async (req, res) => {
  const event = req.stripeEvent;

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailure(event.data.object);
        break;

      case "account.updated":
        await handleAccountUpdate(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};

/*** Gestisce il successo del pagamento */
const handlePaymentSuccess = async (paymentIntent) => {
  const metadata = paymentIntent.metadata;

  // Conferma prenotazione nel database
  await db.saveBooking({
    payment_intent_id: paymentIntent.id,
    listing_id: metadata.listing_id,
    host_id: metadata.host_id,
    customer_email: metadata.customer_email,
    checkin: metadata.checkin,
    checkout: metadata.checkout,
    guests: parseInt(metadata.guests),
    amount_paid: paymentIntent.amount,
    status: "confirmed",
    created_at: new Date(),
  });

  // Invia email di conferma
  await sendConfirmationEmail(metadata, paymentIntent.amount);

  console.log("✅ Payment succeeded and booking confirmed:", paymentIntent.id);
};

/*** Gestisce il fallimento del pagamento */
const handlePaymentFailure = async (paymentIntent) => {
  console.log(
    "❌ Payment failed:",
    paymentIntent.id,
    paymentIntent.last_payment_error
  );

  // Invia email di fallimento al cliente
  if (paymentIntent.metadata?.customer_email) {
    await sendPaymentFailureEmail(
      paymentIntent.metadata.customer_email,
      paymentIntent.id,
      paymentIntent.last_payment_error
    );
  }

  // TODO: Libera eventuali slot di prenotazione bloccati
};

/*** Gestisce l'aggiornamento dell'account host*/
const handleAccountUpdate = async (account) => {
  console.log("Account updated:", account.id);
  // TODO: Aggiorna stato account host nel database
  // await db.updateHostAccountStatus(account.id, {
  //   charges_enabled: account.charges_enabled,
  //   payouts_enabled: account.payouts_enabled,
  // });
};

module.exports = {
  handleWebhook,
};

const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // Tua chiave segreta
const cron = require("node-cron");
const app = express();

app.use(express.json());

// Database mock functions (sostituisci con il tuo DB)
const db = {
  async getHostStripeAccount(hostId) {
    // Recupera account Stripe dell'host dal database
    return "acct_host_stripe_id"; // Placeholder
  },

  async saveBooking(bookingData) {
    // Salva prenotazione nel database
    console.log("Saving booking:", bookingData);
  },

  async getCompletedBookings() {
    // Recupera prenotazioni completate da processare
    return [];
  },

  async markBookingAsPaid(bookingId) {
    // Marca prenotazione come pagata
    console.log("Booking marked as paid:", bookingId);
  },
};

// ========================================
// PAYMENT PROCESSING
// ========================================

app.post("/api/create-payment-intent", async (req, res) => {
  try {
    const { amount, listing_id, host_id, booking_data, customer_email } =
      req.body;

    // Validazione input
    if (
      !amount ||
      !listing_id ||
      !host_id ||
      !booking_data ||
      !customer_email
    ) {
      return res.status(400).json({ error: "Dati mancanti" });
    }

    // Recupera account Stripe dell'host
    const hostStripeAccount = await db.getHostStripeAccount(host_id);
    if (!hostStripeAccount) {
      return res
        .status(400)
        .json({ error: "Host non configurato per pagamenti" });
    }

    // Calcola commissioni
    const COMMISSION_RATE = 0.12; // 12%
    const platformFee = Math.round(amount * COMMISSION_RATE);
    const hostAmount = amount - platformFee;

    // OPZIONE 1: Usando Destination Charges (raccomandato per B&B)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "eur",
      application_fee_amount: platformFee,
      transfer_data: {
        destination: hostStripeAccount,
      },
      metadata: {
        listing_id,
        host_id,
        checkin: booking_data.checkin,
        checkout: booking_data.checkout,
        guests: booking_data.guests.toString(),
        customer_email,
        platform_fee: platformFee.toString(),
        host_amount: hostAmount.toString(),
      },
      receipt_email: customer_email,
      description: `Prenotazione B&B ${listing_id}`,
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount_breakdown: {
        total: amount,
        host_amount: hostAmount,
        platform_fee: platformFee,
      },
    });
  } catch (error) {
    console.error("Payment Intent creation failed:", error);
    res.status(400).json({ error: error.message });
  }
});

// OPZIONE 2: Payment Intent separato + Transfer manuale
app.post("/api/create-payment-intent-manual", async (req, res) => {
  try {
    const { amount, listing_id, host_id, booking_data, customer_email } =
      req.body;

    // Validazione
    if (!amount || !listing_id || !host_id) {
      return res.status(400).json({ error: "Dati mancanti" });
    }

    // Payment Intent sulla piattaforma principale
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
});

// ========================================
// WEBHOOK HANDLING
// ========================================

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, "whsec_...");
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return res.status(400).send(`Webhook signature verification failed.`);
    }

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
      }
    } catch (error) {
      console.error("Webhook handler error:", error);
      return res.status(500).json({ error: "Webhook processing failed" });
    }

    res.json({ received: true });
  }
);

async function handlePaymentSuccess(paymentIntent) {
  const metadata = paymentIntent.metadata;

  // Conferma prenotazione
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

  console.log("Payment succeeded and booking confirmed:", paymentIntent.id);
}

async function handlePaymentFailure(paymentIntent) {
  console.log(
    "Payment failed:",
    paymentIntent.id,
    paymentIntent.last_payment_error
  );
  // Invia email di fallimento al cliente
  // Libera eventuali slot di prenotazione bloccati
}

async function handleAccountUpdate(account) {
  console.log("Account updated:", account.id);
  // Aggiorna stato account host nel database
}

// ========================================
// STRIPE CONNECT - HOST ONBOARDING
// ========================================

app.post("/api/onboard-host", async (req, res) => {
  try {
    const { host_email, host_id, business_type = "individual" } = req.body;

    if (!host_email || !host_id) {
      return res.status(400).json({ error: "Email e ID host richiesti" });
    }

    // Crea account Express per l'host
    const account = await stripe.accounts.create({
      type: "express",
      country: "IT",
      email: host_email,
      business_type: business_type,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        mcc: "7011", // Codice per hotels/motels
        product_description: "Servizi di alloggio B&B",
      },
    });

    // Crea link di onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.BASE_URL}/host/reauth?host_id=${host_id}`,
      return_url: `${process.env.BASE_URL}/host/dashboard?host_id=${host_id}`,
      type: "account_onboarding",
    });

    // Salva nel database l'associazione host_id -> stripe_account_id
    // await db.saveHostStripeAccount(host_id, account.id);

    res.json({
      account_id: account.id,
      onboarding_url: accountLink.url,
    });
  } catch (error) {
    console.error("Host onboarding failed:", error);
    res.status(400).json({ error: error.message });
  }
});

// Verifica stato account host
app.get("/api/host-status/:host_id", async (req, res) => {
  try {
    const { host_id } = req.params;

    // Recupera account ID dal database
    const stripeAccountId = await db.getHostStripeAccount(host_id);
    if (!stripeAccountId) {
      return res.json({ configured: false });
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);

    res.json({
      configured: true,
      account_id: stripeAccountId,
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements,
    });
  } catch (error) {
    console.error("Host status check failed:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========================================
// MANUAL TRANSFERS (se non usi destination charges)
// ========================================

app.post("/api/manual-transfer", async (req, res) => {
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
    const COMMISSION_RATE = 0.12;
    const platformFee = Math.round(paymentIntent.amount * COMMISSION_RATE);
    const hostAmount = paymentIntent.amount - platformFee;

    // Recupera account host
    const hostStripeAccount = await db.getHostStripeAccount(host_id);

    // Crea transfer
    const transfer = await stripe.transfers.create({
      amount: hostAmount,
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
      amount_transferred: hostAmount,
      platform_fee: platformFee,
    });
  } catch (error) {
    console.error("Manual transfer failed:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========================================
// AUTOMATED PAYOUTS
// ========================================

// Payout automatici ogni lunedì alle 10:00
cron.schedule("0 10 * * 1", async () => {
  console.log("🔄 Avvio payout automatici settimanali...");
  await processWeeklyPayouts();
});

async function processWeeklyPayouts() {
  try {
    const bookingsToProcess = await db.getCompletedBookings();
    console.log(
      `📊 Trovate ${bookingsToProcess.length} prenotazioni da processare`
    );

    for (const booking of bookingsToProcess) {
      try {
        const COMMISSION_RATE = 0.12;
        const platformFee = Math.round(booking.amount * COMMISSION_RATE);
        const hostAmount = booking.amount - platformFee;

        await stripe.transfers.create({
          amount: hostAmount,
          currency: "eur",
          destination: booking.host_stripe_account,
          description: `Payout settimanale - Prenotazione ${booking.id}`,
          metadata: {
            booking_id: booking.id,
            host_id: booking.host_id,
            listing_id: booking.listing_id,
          },
        });

        await db.markBookingAsPaid(booking.id);
        console.log(`✅ Payout completato per prenotazione ${booking.id}`);
      } catch (error) {
        console.error(
          `❌ Payout fallito per prenotazione ${booking.id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("❌ Errore nel processo di payout automatico:", error);
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

async function sendConfirmationEmail(metadata, amount) {
  // Implementa invio email
  console.log("📧 Invio email di conferma a:", metadata.customer_email);
  console.log("💰 Importo pagato:", (amount / 100).toFixed(2), "EUR");
}

// Endpoint per testare il sistema
app.get("/api/test", (req, res) => {
  res.json({
    message: "API B&B Stripe funzionante",
    timestamp: new Date().toISOString(),
  });
});

app.listen(3001, () => {
  console.log("🚀 Server B&B API avviato sulla porta 3000");
});

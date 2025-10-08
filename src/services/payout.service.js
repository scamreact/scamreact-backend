const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cron = require("node-cron");
const db = require("../database/db");
const { calculateFees } = require("../utils/payments/stripe.utils.js");

/*** Processa i payout settimanali automatici */
const processWeeklyPayouts = async () => {
  try {
    const bookingsToProcess = await db.getCompletedBookings();
    console.log(
      `📊 Trovate ${bookingsToProcess.length} prenotazioni da processare`
    );

    for (const booking of bookingsToProcess) {
      try {
        const fees = calculateFees(booking.amount);

        await stripe.transfers.create({
          amount: fees.hostAmount,
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
};

/*** Inizializza i cron job per i payout automatici */
const initializePayoutScheduler = () => {
  // Payout automatici ogni lunedì alle 10:00
  cron.schedule("0 10 * * 1", async () => {
    console.log("🔄 Avvio payout automatici settimanali...");
    await processWeeklyPayouts();
  });

  console.log(
    "⏰ Scheduler payout automatici attivato (ogni lunedì alle 10:00)"
  );
};

module.exports = {
  processWeeklyPayouts,
  initializePayoutScheduler,
};

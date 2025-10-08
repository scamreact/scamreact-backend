const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const db = require("../database/db");

/*** Onboarding host su Stripe Connect */
const onboardHost = async (req, res) => {
  try {
    const { host_email, host_id, business_type = "individual" } = req.body;

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
    await db.saveHostStripeAccount(host_id, account.id);

    res.json({
      account_id: account.id,
      onboarding_url: accountLink.url,
    });
  } catch (error) {
    console.error("Host onboarding failed:", error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Verifica stato account host
 */
const getHostStatus = async (req, res) => {
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
};

module.exports = {
  onboardHost,
  getHostStatus,
};

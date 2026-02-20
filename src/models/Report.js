const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    // Testo del messaggio truffa (già redatto lato client o qui)
    message: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 5000,
      trim: true,
    },

    // Tipo di truffa
    scamType: {
      type: String,
      required: true,
      enum: [
        "phishing_smishing",
        "impersonation_bank",
        "fake_investment",
        "marketplace_scam",
        "job_scam",
        "other",
      ],
    },

    // Canale attraverso cui è arrivata
    channel: {
      type: String,
      required: true,
      enum: ["whatsapp", "sms", "email", "phone_call", "website", "other"],
    },

    // Consenso alla condivisione pubblica anonima
    consentPublic: {
      type: Boolean,
      default: true,
    },

    // Metadati anonimi (nessun dato personale)
    meta: {
      // Paese/lingua rilevato dall'header Accept-Language
      lang: { type: String, maxlength: 10 },
      // User-agent generico (solo browser family, non versione)
      browserFamily: { type: String, maxlength: 50 },
    },

    // Data di creazione (usata per trend temporali)
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // Non aggiunge updatedAt (le segnalazioni sono immutabili)
    timestamps: false,
    versionKey: false,
  }
);

// Indici per query frequenti
reportSchema.index({ scamType: 1, createdAt: -1 });
reportSchema.index({ channel: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);

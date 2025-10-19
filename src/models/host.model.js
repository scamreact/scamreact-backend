const mongoose = require("mongoose");

const hostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    phone: {
      type: String,
    },
    address: {
      street: String,
      city: String,
      province: String,
      postalCode: String,
      country: { type: String, default: "Italia" },
    },
    // Dati fiscali
    vatNumber: {
      type: String,
      required: true,
      unique: true,
    },
    fiscalCode: String,
    // Bank info per pagamenti
    bankAccount: {
      iban: String,
      bankName: String,
      accountHolder: String,
    },
    // Verifica e status
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "rejected"],
      default: "pending",
    },
    // Statistiche
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    responseRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    responseTime: {
      type: Number, // in ore
      default: 24,
    },
    // Documenti caricati
    documents: [
      {
        type: {
          type: String,
          enum: ["id", "business_license", "tax_document", "other"],
        },
        url: String,
        uploadedAt: { type: Date, default: Date.now },
        verified: { type: Boolean, default: false },
      },
    ],
    // Preferenze
    preferences: {
      language: { type: String, default: "it" },
      currency: { type: String, default: "EUR" },
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indici per performance
hostSchema.index({ status: 1 });

// Virtual per listings
hostSchema.virtual("listings", {
  ref: "Accommodation",
  localField: "user",
  foreignField: "owner",
});

const Host = mongoose.model("Host", hostSchema);

module.exports = Host;

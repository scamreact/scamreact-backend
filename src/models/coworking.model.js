// const mongoose = require("mongoose");
// const { Schema } = mongoose;

// const coworkingSchema = new Schema({
//   title: {
//     type: String,
//   },
//   description: {
//     type: String,
//   },
//   image: {
//     type: String,
//   },
//   price: {
//     type: Number,
//   },
//   duration: {
//     type: String,
//   },
//   category: {
//     type: String,
//   },
//   // availability: {
//   //   type: Date,
//   // },
// });

// const Coworking = mongoose.model("Coworking", coworkingSchema);

// module.exports = Coworking;

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cowLocationSchema = new Schema({
  address: { type: String },
  city: { type: String },
  state: { type: String },
  zip: { type: String },
  country: { type: String },
  coordinates: {
    // GeoJSON Point
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
});

const coworkingSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, index: true }, // utile per url
    description: { type: String },
    images: [{ type: String }], // array di URL
    pricePerDay: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "EUR" },
    category: {
      type: String,
      enum: ["open-space", "private-room", "meeting-room", "hub", "other"],
      default: "open-space",
    },
    capacity: { type: Number, default: 1, min: 1 },
    amenities: [{ type: String }], // e.g. ['wifi','printer','coffee']
    location: cowLocationSchema,
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    openingHours: {
      // semplice fallback: orario per giorno (opzionale)
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
    minDays: { type: Number, default: 1 }, // soggiorno minimo in giorni
    maxDays: { type: Number }, // opzionale
    ratingCount: { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 }, // per virtual averageRating
    published: { type: Boolean, default: false },
    borgo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Borgo",
      required: true,
    }, // 🔗 collegamento
  },

  { timestamps: true }
);

// Index per ricerche geospaziali
coworkingSchema.index({ "location.coordinates": "2dsphere" });

// Virtual per calcolare la valutazione media
coworkingSchema.virtual("averageRating").get(function () {
  if (this.ratingCount === 0) return 0;
  return this.ratingSum / this.ratingCount;
});

module.exports = mongoose.model("Coworking", coworkingSchema);

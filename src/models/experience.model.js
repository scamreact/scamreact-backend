// const mongoose = require("mongoose");
// const { Schema } = mongoose;

// const experienceSchema = new Schema({
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
//   borgo: { type: mongoose.Schema.Types.ObjectId, ref: "Borgo", required: true }, // 🔗 collegamento
// });

// const Experience = mongoose.model("Experience", experienceSchema);

// module.exports = Experience;

// models/Experience.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ExperienceSchema = new Schema(
  {
    borgo: { type: Schema.Types.ObjectId, ref: "Borgo", required: true },
    slug: { type: String, index: true, unique: true },
    title: { type: String, required: true },
    shortDescription: { type: String },
    description: { type: String }, // HTML allowed if sanitized server-side
    image: { type: String },
    gallery: [{ type: String }],
    videoUrl: { type: String },
    videoId: { type: String },
    price: { type: Number, default: 0 },
    currency: { type: String, default: "EUR" },
    duration: { type: String }, // human readable
    durationMinutes: { type: Number },
    category: { type: String, default: "food_and_beverage" },
    highlights: [{ type: String }],
    amenities: [{ type: String }],
    capacity: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 10 },
    },
    meetingPoint: {
      address: String,
      mapEmbed: String,
    },
    bookingRules: {
      preBookingRequired: { type: Boolean, default: true },
      cancellationPolicy: { type: String },
      ageRestriction: { type: Number, default: null },
    },
    language: [{ type: String }],
    host: {
      name: String,
      contactEmail: String,
      phone: String,
    },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    tags: [{ type: String }],
    published: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Experience", ExperienceSchema);

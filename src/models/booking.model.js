// ==================== MODEL: booking.model.js (esempio) ====================
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "listingType",
      required: true,
    },
    listingType: {
      type: String,
      enum: ["Accommodation", "Experience", "Coworking"],
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    customer_name: String,
    customer_email: String,
    checkin: Date,
    checkout: Date,
    startDate: Date,
    endDate: Date,
    guests: Number,
    numberOfGuests: Number,
    totalPrice: Number,
    amount: Number,
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);

exports = module.exports = Booking;

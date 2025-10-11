// ==================== ROUTES: booking.routes.js ====================
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
// const {
//   updateBookingStatus,
// } = require("../controllers/host.stripe.controller");
const Booking = require("../models/booking.model");

// // PATCH /bookings/:id/status - Aggiorna stato (già nel host.controller)
// router.patch("/:id/status", authenticate, updateBookingStatus);

// GET /bookings/:id - Dettaglio singola prenotazione
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate("listing")
      .populate("customer", "name email");

    if (!booking) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }

    res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /bookings - Crea nuova prenotazione
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      listing,
      listingType,
      checkin,
      checkout,
      guests,
      customer_name,
      customer_email,
      totalPrice,
    } = req.body;

    // Validazione base
    if (!listing || !listingType || !checkin || !checkout) {
      return res.status(400).json({ error: "Campi obbligatori mancanti" });
    }

    const booking = await Booking.create({
      listing,
      listingType,
      customer: req.user._id,
      customer_name: customer_name || req.user.name,
      customer_email: customer_email || req.user.email,
      checkin,
      checkout,
      startDate: checkin,
      endDate: checkout,
      guests: guests || 1,
      numberOfGuests: guests || 1,
      totalPrice,
      amount: totalPrice,
      status: "pending",
    });

    res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /bookings/user/me - Prenotazioni dell'utente loggato
router.get("/user/me", authenticate, async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate("listing")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /bookings/:id - Cancella prenotazione (solo se pending)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }

    // Verifica ownership (cliente o host)
    const isCustomer = booking.customer?.toString() === req.user._id.toString();
    const listing = await booking.populate("listing");
    const isHost =
      listing?.listing?.owner?.toString() === req.user._id.toString();

    if (!isCustomer && !isHost) {
      return res.status(403).json({ error: "Non autorizzato" });
    }

    // Solo pending può essere cancellata
    if (booking.status !== "pending") {
      return res.status(400).json({
        error: "Solo prenotazioni pending possono essere cancellate",
      });
    }

    await booking.deleteOne();

    res.status(200).json({
      success: true,
      message: "Prenotazione cancellata",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

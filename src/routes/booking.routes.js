const express = require("express");
const router = express.Router();
const {
  createBooking,
  getAllBookings,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  getBookingsByListing,
  updateBooking,
  getBookingStats,
} = require("../controllers/booking.controller");
const {
  authenticate,
  requireUser,
  requireAdmin,
  requireAdminOrHost,
} = require("../middleware/auth.middleware");

// ==================== PUBLIC ROUTES (nessuna autenticazione) ====================
// Se vuoi che chiunque possa vedere disponibilità, aggiungi qui

// ==================== USER ROUTES ====================

// Crea una nuova prenotazione (utente autenticato)
router.post("/", authenticate, requireUser, createBooking);

// Ottieni le proprie prenotazioni
router.get("/my-bookings", authenticate, requireUser, getMyBookings);

// Ottieni dettagli di una singola prenotazione
router.get("/:_id", authenticate, getBookingById);

// Cancella una prenotazione
router.delete("/:_id", authenticate, cancelBooking);

// Aggiorna lo status di una prenotazione
router.patch("/:_id/status", authenticate, updateBookingStatus);

// ==================== ADMIN/HOST ROUTES ====================

// Ottieni tutte le prenotazioni (con filtri)
router.get("/", authenticate, requireAdmin, getAllBookings);

// Ottieni prenotazioni per un listing specifico
router.get(
  "/listing/:listingId",
  authenticate,
  requireAdminOrHost,
  getBookingsByListing
);

// Aggiorna completamente una prenotazione
router.put("/:_id", authenticate, requireAdmin, updateBooking);

// Statistiche prenotazioni
router.get("/admin/stats", authenticate, requireAdmin, getBookingStats);

module.exports = router;

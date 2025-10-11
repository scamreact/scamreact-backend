const express = require("express");
const router = express.Router();

const {
  createHost,
  getHost,
  updateHost,
  getHostBookings,
  getHostListings,
  getHostStats,
  verifyHost,
} = require("../controllers/host.controller.js");
const {
  authenticate,
  requireHost,
  requireAdmin,
} = require("../middleware/auth.middleware");

// Registrazione host (utente autenticato)
router.post("/register", authenticate, createHost);

// Profilo host (utente autenticato)
router.get("/profile", authenticate, getHost);
router.patch("/profile", authenticate, updateHost);

// Dashboard host (richiede host verificato)
router.get("/bookings", authenticate, requireHost, getHostBookings);
router.get("/listings", authenticate, requireHost, getHostListings);
router.get("/stats", authenticate, requireHost, getHostStats);

// Admin routes
router.patch("/verify/:hostId", authenticate, requireAdmin, verifyHost);

module.exports = router;

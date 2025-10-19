const Model = require("mongoose");
const mongoose = require("mongoose");
const { error } = require("console");
const Booking = require("../models/booking.model");
const Accommodation = require("../models/accommodation.model");
const Experience = require("../models/experience.model");
const Coworking = require("../models/coworking.model");
const User = require("../models/user.model");

// ==================== CREATE BOOKING ====================

/**
 * Crea una nuova prenotazione
 * POST /api/bookings
 */
const createBooking = async (req, res) => {
  try {
    const {
      listing,
      listingType,
      checkIn,
      checkOut,
      startDate,
      endDate,
      guests,
      totalPrice,
      notes,
    } = req.body;

    // Verifica che il listing esista
    let listingDoc;
    switch (listingType) {
      case "Accommodation":
        listingDoc = await Accommodation.findById(listing);
        break;
      case "Experience":
        listingDoc = await Experience.findById(listing);
        break;
      case "Coworking":
        listingDoc = await Coworking.findById(listing);
        break;
      default:
        return res.status(400).json({ error: "Tipo di listing non valido" });
    }

    if (!listingDoc) {
      return res.status(404).json({ error: `${listingType} non trovato` });
    }

    // Ottieni info utente autenticato
    const customer = req.user._id;
    const customerInfo = {
      name: req.user.name || req.user.username,
      email: req.user.email,
      phone: req.user.phone,
    };

    // Crea la prenotazione
    const booking = new Booking({
      listing,
      listingType,
      customer,
      customerInfo,
      checkIn,
      checkOut,
      startDate,
      endDate,
      guests,
      totalPrice,
      notes,
      status: "pending",
    });

    await booking.save();

    // Popola i dati prima di rispondere
    await booking.populate("listing");
    await booking.populate("customer", "name email");

    res.status(201).json({
      message: "Prenotazione creata con successo",
      booking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({
      error: "Errore durante la creazione della prenotazione",
      details: error.message,
    });
  }
};

// ==================== GET ALL BOOKINGS (ADMIN) ====================

/**
 * Ottieni tutte le prenotazioni (solo admin)
 * GET /api/bookings
 */
const getAllBookings = async (req, res) => {
  try {
    const { status, listingType, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (listingType) query.listingType = listingType;

    const bookings = await Booking.find(query)
      .populate("listing")
      .populate("customer", "name email phone")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({
      error: "Errore durante il recupero delle prenotazioni",
      details: error.message,
    });
  }
};

// ==================== GET USER BOOKINGS ====================

/**
 * Ottieni le prenotazioni dell'utente autenticato
 * GET /api/bookings/my-bookings
 */
const getMyBookings = async (req, res) => {
  try {
    const { status } = req.query;
    const userId = req.user._id;

    const query = { customer: userId };
    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate("listing")
      .sort({ createdAt: -1 });

    res.status(200).json({
      bookings,
      total: bookings.length,
    });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({
      error: "Errore durante il recupero delle tue prenotazioni",
      details: error.message,
    });
  }
};

// ==================== GET SINGLE BOOKING ====================

/**
 * Ottieni dettagli di una prenotazione specifica
 * GET /api/bookings/:id
 */
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate("listing")
      .populate("customer", "name email phone");

    if (!booking) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }

    // Verifica che l'utente possa vedere questa prenotazione
    const isOwner = booking.customer._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: "Non sei autorizzato a visualizzare questa prenotazione",
      });
    }

    res.status(200).json({ booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({
      error: "Errore durante il recupero della prenotazione",
      details: error.message,
    });
  }
};

// ==================== UPDATE BOOKING STATUS ====================

/**
 * Aggiorna lo stato di una prenotazione
 * PATCH /api/bookings/:id/status
 */
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }

    // Verifica permessi
    const isOwner = booking.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: "Non sei autorizzato a modificare questa prenotazione",
      });
    }

    // Gli utenti normali possono solo cancellare
    if (isOwner && !isAdmin && status !== "cancelled") {
      return res.status(403).json({
        error: "Puoi solo cancellare le tue prenotazioni",
      });
    }

    // Aggiorna lo status
    booking.status = status;

    if (status === "cancelled") {
      booking.cancellationReason =
        cancellationReason || "Cancellato dall'utente";
      booking.cancelledAt = new Date();
    }

    if (status === "confirmed") {
      booking.confirmedAt = new Date();
    }

    await booking.save();

    await booking.populate("listing");
    await booking.populate("customer", "name email");

    res.status(200).json({
      message: "Status prenotazione aggiornato",
      booking,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({
      error: "Errore durante l'aggiornamento dello status",
      details: error.message,
    });
  }
};

// ==================== CANCEL BOOKING ====================

/**
 * Cancella una prenotazione (shortcut)
 * DELETE /api/bookings/:id
 */
const cancelBooking = async (req, res) => {
  try {
    const { _id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findByIdAndDelete(_id);

    if (!booking) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }

    // Verifica che l'utente possa cancellare
    const isOwner = booking.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: "Non sei autorizzato a cancellare questa prenotazione",
      });
    }

    // Non permettere cancellazione se già completata
    if (booking.status === "completed") {
      return res.status(400).json({
        error: "Non puoi cancellare una prenotazione già completata",
      });
    }

    res.status(200).json({
      message: "Prenotazione cancellata con successo",
      reason: reason || "Cancellato dall'utente",
      booking,
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({
      error: "Errore durante la cancellazione",
      details: error.message,
    });
  }
};

// ==================== GET BOOKINGS BY LISTING ====================

/**
 * Ottieni tutte le prenotazioni per un listing specifico
 * GET /api/bookings/listing/:listingId
 */
const getBookingsByListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { listingType } = req.query;

    if (!listingType) {
      return res.status(400).json({
        error: "Devi specificare il listingType",
      });
    }

    const bookings = await Booking.find({
      listing: listingId,
      listingType: listingType,
    })
      .populate("customer", "name email")
      .sort({ checkIn: 1 });

    res.status(200).json({
      bookings,
      total: bookings.length,
    });
  } catch (error) {
    console.error("Error fetching bookings by listing:", error);
    res.status(500).json({
      error: "Errore durante il recupero delle prenotazioni",
      details: error.message,
    });
  }
};

// ==================== UPDATE BOOKING ====================

/**
 * Aggiorna i dettagli di una prenotazione
 * PUT /api/bookings/:id
 */
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }

    // Solo admin può modificare qualsiasi campo
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Solo gli admin possono modificare le prenotazioni",
      });
    }

    // Aggiorna i campi permessi
    const allowedUpdates = [
      "checkIn",
      "checkOut",
      "startDate",
      "endDate",
      "guests",
      "totalPrice",
      "notes",
      "status",
    ];

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        booking[field] = updates[field];
      }
    });

    await booking.save();

    await booking.populate("listing");
    await booking.populate("customer", "name email");

    res.status(200).json({
      message: "Prenotazione aggiornata con successo",
      booking,
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({
      error: "Errore durante l'aggiornamento della prenotazione",
      details: error.message,
    });
  }
};

// ==================== GET BOOKING STATISTICS ====================

/**
 * Statistiche prenotazioni (per admin/host)
 * GET /api/bookings/stats
 */
const getBookingStats = async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);

    const totalBookings = await Booking.countDocuments();
    const totalRevenue = await Booking.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ]);

    res.status(200).json({
      stats,
      totalBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    console.error("Error fetching booking stats:", error);
    res.status(500).json({
      error: "Errore durante il recupero delle statistiche",
      details: error.message,
    });
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  getBookingsByListing,
  updateBooking,
  getBookingStats,
};

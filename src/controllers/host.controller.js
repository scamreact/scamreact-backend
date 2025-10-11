const Host = require("../models/host.model");
const User = require("../models/user.model");
const Admin = require("../models/admin.model");
const Booking = require("../models/booking.model");
const Accommodation = require("../models/accommodation.model");
const Experience = require("../models/experience.model");
const Coworking = require("../models/coworking.model");
const jwt = require("jsonwebtoken");
const sendWelcomeEmail = require("../utils/admins/adminWelcomeEmail.js");
const generateTokenPayload = require("../utils/auth/generateTokenPayload.js");

// POST /host/register - Registra come host
const createHost = async (req, res) => {
  try {
    dotenv.config();
    // 1) validazione request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // 2) prende campi dalla request
    const {
      businessName,
      bio,
      phone,
      address,
      vatNumber,
      fiscalCode,
      bankAccount,
    } = req.body;

    // 3) assicurati che l'utente sia autenticato (requireAuth prima della route)
    const userId = req.user && req.user._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Utente non autenticato" });
    }

    // 4) controllo duplicati: partita IVA o ragione sociale già usate da altri
    const existingHost = await Host.findOne({
      $or: [{ businessName }, { vatNumber }],
      user: { $ne: userId }, // esclude il caso in cui l'utente stia aggiornando se mai
    });

    if (existingHost) {
      // messaggio chiaro: se clash su vatNumber o businessName
      const field =
        existingHost.vatNumber === vatNumber ? "Partita IVA" : "Nome attività";
      return res.status(409).json({
        success: false,
        message: `${field} già registrata da un altro host.`,
      });
    }

    // 5) crea host (stato pending)
    const host = await Host.create({
      user: userId,
      businessName,
      bio,
      phone,
      address,
      vatNumber,
      fiscalCode,
      bankAccount,
      isVerified: false,
      status: "pending",
    });

    // 6) aggiorna ruolo utente a host (se vuoi mantenerlo)
    await User.findByIdAndUpdate(userId, { role: "host" });

    // 7) risposta
    return res.status(201).json({
      success: true,
      message: "Registrazione host in attesa di verifica",
      host,
    });
  } catch (error) {
    console.error("Errore nella creazione dell'host:", error);

    // Gestione conflict se unique index su vatNumber/back-end lancia E11000
    if (error.code === 11000) {
      const dupKey = Object.keys(error.keyValue || {})[0];
      return res.status(409).json({
        success: false,
        error: `${dupKey} già registrato.`,
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Errore interno",
    });
  }
};

// GET /host/profile - Profilo host dell'utente loggato
const getHost = async (req, res) => {
  try {
    const host = await Host.findOne({ user: req.user._id }).populate(
      "user",
      "name email"
    );

    if (!host) {
      return res.status(404).json({ error: "Profilo host non trovato" });
    }

    res.status(200).json({ success: true, host });
  } catch (error) {
    console.error("Error fetching host profile:", error);
    res.status(500).json({ error: error.message });
  }
};

// PATCH /host/profile - Aggiorna profilo host
const updateHost = async (req, res) => {
  try {
    const allowedFields = [
      "businessName",
      "bio",
      "phone",
      "address",
      "bankAccount",
      "preferences",
    ];

    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const host = await Host.findOneAndUpdate(
      { user: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!host) {
      return res.status(404).json({ error: "Profilo host non trovato" });
    }

    res.status(200).json({ success: true, host });
  } catch (error) {
    console.error("Error updating host profile:", error);
    res.status(500).json({ error: error.message });
  }
};

// GET /host/bookings - Lista prenotazioni host
const getHostBookings = async (req, res) => {
  try {
    const userId = req.user._id;

    // Trova tutti gli annunci dell'host
    const [accommodations, experiences, coworkings] = await Promise.all([
      Accommodation.find({ owner: userId }).select("_id"),
      Experience.find({ owner: userId }).select("_id"),
      Coworking.find({ owner: userId }).select("_id"),
    ]);

    const listingIds = [
      ...accommodations.map((a) => a._id),
      ...experiences.map((e) => e._id),
      ...coworkings.map((c) => c._id),
    ];

    // Trova prenotazioni
    const bookings = await Booking.find({
      listing: { $in: listingIds },
    })
      .populate("listing")
      .populate("customer", "name email")
      .sort({ createdAt: -1 });

    const enrichedBookings = bookings.map((b) => ({
      _id: b._id,
      customer_name: b.customer?.name || b.customer_name,
      customer_email: b.customer?.email || b.customer_email,
      listingName: b.listing?.name || b.listing?.title,
      listingType: b.listingType || "accommodation",
      checkin: b.checkin || b.startDate,
      checkout: b.checkout || b.endDate,
      guests: b.guests || b.numberOfGuests,
      totalPrice: b.totalPrice || b.amount,
      status: b.status,
      createdAt: b.createdAt,
    }));

    res.status(200).json({
      success: true,
      count: enrichedBookings.length,
      bookings: enrichedBookings,
    });
  } catch (error) {
    console.error("Error fetching host bookings:", error);
    res.status(500).json({ error: error.message });
  }
};

// GET /host/listings - Annunci host
const getHostListings = async (req, res) => {
  try {
    const userId = req.user._id;

    const [accommodations, experiences, coworkings] = await Promise.all([
      Accommodation.find({ owner: userId }),
      Experience.find({ owner: userId }),
      Coworking.find({ owner: userId }),
    ]);

    const listings = [
      ...accommodations.map((a) => ({
        _id: a._id,
        name: a.name,
        description: a.description,
        price: a.price || a.price_per_night,
        image: a.image || a.images?.[0],
        type: "accommodation",
        status: a.status || "active",
      })),
      ...experiences.map((e) => ({
        _id: e._id,
        name: e.name || e.title,
        description: e.description,
        price: e.price,
        image: e.image || e.images?.[0],
        type: "experience",
        status: e.status || "active",
      })),
      ...coworkings.map((c) => ({
        _id: c._id,
        name: c.name || c.title,
        description: c.description,
        price: c.pricePerDay,
        image: c.image || c.images?.[0],
        type: "coworking",
        status: c.status || "active",
      })),
    ];

    res.status(200).json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    console.error("Error fetching host listings:", error);
    res.status(500).json({ error: error.message });
  }
};

// GET /host/stats - Statistiche host
const getHostStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [accommodations, experiences, coworkings] = await Promise.all([
      Accommodation.find({ owner: userId }),
      Experience.find({ owner: userId }),
      Coworking.find({ owner: userId }),
    ]);

    const listingIds = [
      ...accommodations.map((a) => a._id),
      ...experiences.map((e) => e._id),
      ...coworkings.map((c) => c._id),
    ];

    const bookings = await Booking.find({
      listing: { $in: listingIds },
    });

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce(
      (sum, b) => sum + (b.totalPrice || b.amount || 0),
      0
    );

    const confirmedBookings = bookings.filter(
      (b) => b.status === "confirmed" || b.status === "completed"
    ).length;

    const activeListings = accommodations.length + coworkings.length;
    const occupancyRate =
      activeListings > 0
        ? Math.min(
            Math.round((confirmedBookings / (activeListings * 30)) * 100),
            100
          )
        : 0;

    res.status(200).json({
      success: true,
      totalRevenue: totalRevenue.toFixed(2),
      totalBookings,
      confirmedBookings,
      activeListings,
      occupancyRate,
    });
  } catch (error) {
    console.error("Error calculating host stats:", error);
    res.status(500).json({ error: error.message });
  }
};

// PATCH /host/verify/:hostId - Verifica host (ADMIN ONLY)
const verifyHost = async (req, res) => {
  try {
    const { hostId } = req.params;
    const { status } = req.body; // 'active' or 'rejected'

    const host = await Host.findById(hostId);
    if (!host) {
      return res.status(404).json({ error: "Host non trovato" });
    }

    host.status = status;
    if (status === "active") {
      host.isVerified = true;
      host.verifiedAt = new Date();
    }

    await host.save();

    res.status(200).json({
      success: true,
      message: `Host ${status === "active" ? "verificato" : "rifiutato"}`,
      host,
    });
  } catch (error) {
    console.error("Error verifying host:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createHost,
  getHost,
  updateHost,
  getHostBookings,
  getHostListings,
  getHostStats,
  verifyHost,
};

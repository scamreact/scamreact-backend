// const Host = require("../models/host.model");
// const User = require("../models/user.model");
// const Admin = require("../models/admin.model");
// const Booking = require("../models/booking.model");
// const Accommodation = require("../models/accommodation.model");
// const Experience = require("../models/experience.model");
// const Coworking = require("../models/coworking.model");
// const jwt = require("jsonwebtoken");
// const sendWelcomeEmail = require("../utils/admins/adminWelcomeEmail.js");
// const generateTokenPayload = require("../utils/auth/generateTokenPayload.js");

// // POST /host/register - Registra come host
// const createHost = async (req, res) => {
//   try {
//     dotenv.config();
//     // 1) validazione request
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ success: false, errors: errors.array() });
//     }

//     // 2) prende campi dalla request
//     const {
//       businessName,
//       bio,
//       phone,
//       address,
//       vatNumber,
//       fiscalCode,
//       bankAccount,
//     } = req.body;

//     // 3) assicurati che l'utente sia autenticato (requireAuth prima della route)
//     const userId = req.user && req.user._id;
//     if (!userId) {
//       return res
//         .status(401)
//         .json({ success: false, error: "Utente non autenticato" });
//     }

//     // 4) controllo duplicati: partita IVA o ragione sociale già usate da altri
//     const existingHost = await Host.findOne({
//       $or: [{ businessName }, { vatNumber }],
//       user: { $ne: userId }, // esclude il caso in cui l'utente stia aggiornando se mai
//     });

//     if (existingHost) {
//       // messaggio chiaro: se clash su vatNumber o businessName
//       const field =
//         existingHost.vatNumber === vatNumber ? "Partita IVA" : "Nome attività";
//       return res.status(409).json({
//         success: false,
//         message: `${field} già registrata da un altro host.`,
//       });
//     }

//     // 5) crea host (stato pending)
//     const host = await Host.create({
//       user: userId,
//       businessName,
//       bio,
//       phone,
//       address,
//       vatNumber,
//       fiscalCode,
//       bankAccount,
//       isVerified: false,
//       status: "pending",
//     });

//     // 6) aggiorna ruolo utente a host (se vuoi mantenerlo)
//     await User.findByIdAndUpdate(userId, { role: "host" });

//     // 7) risposta
//     return res.status(201).json({
//       success: true,
//       message: "Registrazione host in attesa di verifica",
//       host,
//     });
//   } catch (error) {
//     console.error("Errore nella creazione dell'host:", error);

//     // Gestione conflict se unique index su vatNumber/back-end lancia E11000
//     if (error.code === 11000) {
//       const dupKey = Object.keys(error.keyValue || {})[0];
//       return res.status(409).json({
//         success: false,
//         error: `${dupKey} già registrato.`,
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       error: error.message || "Errore interno",
//     });
//   }
// };

// // GET /host/profile - Profilo host dell'utente loggato
// const getHost = async (req, res) => {
//   try {
//     const host = await Host.findOne({ user: req.user._id }).populate(
//       "user",
//       "name email"
//     );

//     if (!host) {
//       return res.status(404).json({ error: "Profilo host non trovato" });
//     }

//     res.status(200).json({ success: true, host });
//   } catch (error) {
//     console.error("Error fetching host profile:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // PATCH /host/profile - Aggiorna profilo host
// const updateHost = async (req, res) => {
//   try {
//     const allowedFields = [
//       "businessName",
//       "bio",
//       "phone",
//       "address",
//       "bankAccount",
//       "preferences",
//     ];

//     const updates = {};
//     Object.keys(req.body).forEach((key) => {
//       if (allowedFields.includes(key)) {
//         updates[key] = req.body[key];
//       }
//     });

//     const host = await Host.findOneAndUpdate(
//       { user: req.user._id },
//       { $set: updates },
//       { new: true, runValidators: true }
//     );

//     if (!host) {
//       return res.status(404).json({ error: "Profilo host non trovato" });
//     }

//     res.status(200).json({ success: true, host });
//   } catch (error) {
//     console.error("Error updating host profile:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // GET /host/bookings - Lista prenotazioni host
// const getHostBookings = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // Trova tutti gli annunci dell'host
//     const [accommodations, experiences, coworkings] = await Promise.all([
//       Accommodation.find({ owner: userId }).select("_id"),
//       Experience.find({ owner: userId }).select("_id"),
//       Coworking.find({ owner: userId }).select("_id"),
//     ]);

//     const listingIds = [
//       ...accommodations.map((a) => a._id),
//       ...experiences.map((e) => e._id),
//       ...coworkings.map((c) => c._id),
//     ];

//     // Trova prenotazioni
//     const bookings = await Booking.find({
//       listing: { $in: listingIds },
//     })
//       .populate("listing")
//       .populate("customer", "name email")
//       .sort({ createdAt: -1 });

//     const enrichedBookings = bookings.map((b) => ({
//       _id: b._id,
//       customer_name: b.customer?.name || b.customer_name,
//       customer_email: b.customer?.email || b.customer_email,
//       listingName: b.listing?.name || b.listing?.title,
//       listingType: b.listingType || "accommodation",
//       checkin: b.checkin || b.startDate,
//       checkout: b.checkout || b.endDate,
//       guests: b.guests || b.numberOfGuests,
//       totalPrice: b.totalPrice || b.amount,
//       status: b.status,
//       createdAt: b.createdAt,
//     }));

//     res.status(200).json({
//       success: true,
//       count: enrichedBookings.length,
//       bookings: enrichedBookings,
//     });
//   } catch (error) {
//     console.error("Error fetching host bookings:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // GET /host/listings - Annunci host
// const getHostListings = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const [accommodations, experiences, coworkings] = await Promise.all([
//       Accommodation.find({ owner: userId }),
//       Experience.find({ owner: userId }),
//       Coworking.find({ owner: userId }),
//     ]);

//     const listings = [
//       ...accommodations.map((a) => ({
//         _id: a._id,
//         name: a.name,
//         description: a.description,
//         price: a.price || a.price_per_night,
//         image: a.image || a.images?.[0],
//         type: "accommodation",
//         status: a.status || "active",
//       })),
//       ...experiences.map((e) => ({
//         _id: e._id,
//         name: e.name || e.title,
//         description: e.description,
//         price: e.price,
//         image: e.image || e.images?.[0],
//         type: "experience",
//         status: e.status || "active",
//       })),
//       ...coworkings.map((c) => ({
//         _id: c._id,
//         name: c.name || c.title,
//         description: c.description,
//         price: c.pricePerDay,
//         image: c.image || c.images?.[0],
//         type: "coworking",
//         status: c.status || "active",
//       })),
//     ];

//     res.status(200).json({
//       success: true,
//       count: listings.length,
//       listings,
//     });
//   } catch (error) {
//     console.error("Error fetching host listings:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // GET /host/stats - Statistiche host
// const getHostStats = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const [accommodations, experiences, coworkings] = await Promise.all([
//       Accommodation.find({ owner: userId }),
//       Experience.find({ owner: userId }),
//       Coworking.find({ owner: userId }),
//     ]);

//     const listingIds = [
//       ...accommodations.map((a) => a._id),
//       ...experiences.map((e) => e._id),
//       ...coworkings.map((c) => c._id),
//     ];

//     const bookings = await Booking.find({
//       listing: { $in: listingIds },
//     });

//     const totalBookings = bookings.length;
//     const totalRevenue = bookings.reduce(
//       (sum, b) => sum + (b.totalPrice || b.amount || 0),
//       0
//     );

//     const confirmedBookings = bookings.filter(
//       (b) => b.status === "confirmed" || b.status === "completed"
//     ).length;

//     const activeListings = accommodations.length + coworkings.length;
//     const occupancyRate =
//       activeListings > 0
//         ? Math.min(
//             Math.round((confirmedBookings / (activeListings * 30)) * 100),
//             100
//           )
//         : 0;

//     res.status(200).json({
//       success: true,
//       totalRevenue: totalRevenue.toFixed(2),
//       totalBookings,
//       confirmedBookings,
//       activeListings,
//       occupancyRate,
//     });
//   } catch (error) {
//     console.error("Error calculating host stats:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // PATCH /host/verify/:hostId - Verifica host (ADMIN ONLY)
// const verifyHost = async (req, res) => {
//   try {
//     const { hostId } = req.params;
//     const { status } = req.body; // 'active' or 'rejected'

//     const host = await Host.findById(hostId);
//     if (!host) {
//       return res.status(404).json({ error: "Host non trovato" });
//     }

//     host.status = status;
//     if (status === "active") {
//       host.isVerified = true;
//       host.verifiedAt = new Date();
//     }

//     await host.save();

//     res.status(200).json({
//       success: true,
//       message: `Host ${status === "active" ? "verificato" : "rifiutato"}`,
//       host,
//     });
//   } catch (error) {
//     console.error("Error verifying host:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

// module.exports = {
//   createHost,
//   getHost,
//   updateHost,
//   getHostBookings,
//   getHostListings,
//   getHostStats,
//   verifyHost,
// };

const Host = require("../models/host.model");
const User = require("../models/user.model");
const Booking = require("../models/booking.model");
const Accommodation = require("../models/accommodation.model");
const Experience = require("../models/experience.model");
const Coworking = require("../models/coworking.model");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

// ==================== UTILITY FUNCTIONS ====================

/**
 * Crea un errore standardizzato con status code e messaggio
 */
const createError = (statusCode, message, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) error.details = details;
  return error;
};

/**
 * Normalizza i campi indirizzo per consistenza
 */
const normalizeAddress = (address) => {
  if (!address) return null;

  return {
    street: address.street?.trim() || "",
    city: address.city?.trim() || "",
    province: address.province?.trim().toUpperCase() || "",
    postalCode: address.postalCode?.trim() || "",
    country: address.country?.trim() || "Italia",
    coordinates: address.coordinates || null,
  };
};

/**
 * Valida partita IVA italiana (formato base)
 */
const validateVatNumber = (vatNumber) => {
  if (!vatNumber) return false;
  const cleanVat = vatNumber.replace(/\s/g, "");
  return /^[0-9]{11}$/.test(cleanVat);
};

/**
 * Valida codice fiscale italiano (formato base)
 */
const validateFiscalCode = (fiscalCode) => {
  if (!fiscalCode) return false;
  const cleanCode = fiscalCode.toUpperCase().replace(/\s/g, "");
  return /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(cleanCode);
};

/**
 * Valida IBAN italiano (formato base)
 */
const validateIBAN = (iban) => {
  if (!iban) return false;
  const cleanIBAN = iban.replace(/\s/g, "").toUpperCase();
  return /^IT[0-9]{2}[A-Z][0-9]{10}[0-9A-Z]{12}$/.test(cleanIBAN);
};

// ==================== HOST REGISTRATION ====================

/**
 * POST /api/host/register
 * Registra un nuovo host con validazione completa
 * @access Private (authenticate middleware required)
 */
const createHost = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Validazione express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError(400, "Errori di validazione", errors.array()));
    }

    // Estrazione e validazione campi
    const {
      businessName,
      bio,
      phone,
      address,
      vatNumber,
      fiscalCode,
      bankAccount,
    } = req.body;

    // Verifica autenticazione
    const userId = req.user?._id || req.userId;
    if (!userId) {
      await session.abortTransaction();
      return next(createError(401, "Autenticazione richiesta"));
    }

    // Validazione campi obbligatori
    if (!businessName?.trim()) {
      await session.abortTransaction();
      return next(createError(400, "Il nome dell'attività è obbligatorio"));
    }

    if (!vatNumber?.trim()) {
      await session.abortTransaction();
      return next(createError(400, "La partita IVA è obbligatoria"));
    }

    if (!fiscalCode?.trim()) {
      await session.abortTransaction();
      return next(createError(400, "Il codice fiscale è obbligatorio"));
    }

    // Validazione formato partita IVA
    if (!validateVatNumber(vatNumber)) {
      await session.abortTransaction();
      return next(
        createError(
          400,
          "Formato partita IVA non valido. Deve essere di 11 cifre"
        )
      );
    }

    // Validazione formato codice fiscale
    if (!validateFiscalCode(fiscalCode)) {
      await session.abortTransaction();
      return next(createError(400, "Formato codice fiscale non valido"));
    }

    // Validazione IBAN se fornito
    if (bankAccount?.iban && !validateIBAN(bankAccount.iban)) {
      await session.abortTransaction();
      return next(createError(400, "Formato IBAN non valido"));
    }

    // Verifica che l'utente non sia già un host
    const existingUserHost = await Host.findOne({ user: userId }).session(
      session
    );
    if (existingUserHost) {
      await session.abortTransaction();
      return next(createError(409, "Sei già registrato come host"));
    }

    // Verifica duplicati partita IVA o ragione sociale
    const duplicateCheck = await Host.findOne({
      $or: [
        { vatNumber: vatNumber.trim() },
        { businessName: businessName.trim() },
      ],
    }).session(session);

    if (duplicateCheck) {
      await session.abortTransaction();
      const field =
        duplicateCheck.vatNumber === vatNumber.trim()
          ? "Partita IVA"
          : "Nome attività";
      return next(createError(409, `${field} già registrata da un altro host`));
    }

    // Normalizza indirizzo
    const normalizedAddress = normalizeAddress(address);
    if (!normalizedAddress?.city || !normalizedAddress?.province) {
      await session.abortTransaction();
      return next(
        createError(
          400,
          "Indirizzo incompleto. Città e provincia sono obbligatori"
        )
      );
    }

    // Crea documento host
    const hostData = {
      user: userId,
      businessName: businessName.trim(),
      bio: bio?.trim() || "",
      phone: phone?.trim() || "",
      address: normalizedAddress,
      vatNumber: vatNumber.trim(),
      fiscalCode: fiscalCode.trim().toUpperCase(),
      bankAccount: bankAccount
        ? {
            iban: bankAccount.iban?.replace(/\s/g, "").toUpperCase(),
            accountHolder: bankAccount.accountHolder?.trim(),
            bankName: bankAccount.bankName?.trim(),
          }
        : undefined,
      isVerified: false,
      status: "pending",
      createdAt: new Date(),
    };

    const host = await Host.create([hostData], { session });

    // Aggiorna ruolo utente
    await User.findByIdAndUpdate(
      userId,
      {
        role: "host",
        updatedAt: new Date(),
      },
      { session, runValidators: true }
    );

    await session.commitTransaction();

    // Log per audit
    console.log(
      `[HOST REGISTRATION] New host created: ${host[0]._id} by user: ${userId}`
    );

    return res.status(201).json({
      success: true,
      message:
        "Registrazione host completata. Il tuo account è in attesa di verifica da parte del team",
      data: {
        hostId: host[0]._id,
        businessName: host[0].businessName,
        status: host[0].status,
        createdAt: host[0].createdAt,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("[HOST REGISTRATION ERROR]", error);

    // Gestione errori MongoDB duplicati
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const fieldNames = {
        vatNumber: "Partita IVA",
        businessName: "Nome attività",
        fiscalCode: "Codice fiscale",
      };
      return next(
        createError(409, `${fieldNames[field] || field} già registrato`)
      );
    }

    // Gestione errori di validazione MongoDB
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return next(createError(400, "Errore di validazione", messages));
    }

    return next(
      createError(500, "Errore durante la registrazione. Riprova più tardi")
    );
  } finally {
    session.endSession();
  }
};

// ==================== HOST PROFILE ====================

/**
 * GET /api/host/profile
 * Recupera il profilo host dell'utente autenticato
 * @access Private (authenticate + requireHost)
 */
const getHost = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.userId;

    const host = await Host.findOne({ user: userId })
      .populate("user", "name email profilePicture createdAt")
      .select("-__v")
      .lean();

    if (!host) {
      return next(createError(404, "Profilo host non trovato"));
    }

    // Arricchisci con statistiche rapide
    const [accommodations, experiences, coworkings] = await Promise.all([
      Accommodation.countDocuments({ owner: userId }),
      Experience.countDocuments({ owner: userId }),
      Coworking.countDocuments({ owner: userId }),
    ]);

    const totalListings = accommodations + experiences + coworkings;

    return res.status(200).json({
      success: true,
      data: {
        ...host,
        statistics: {
          totalListings,
          accommodations,
          experiences,
          coworkings,
        },
      },
    });
  } catch (error) {
    console.error("[GET HOST PROFILE ERROR]", error);
    return next(createError(500, "Errore durante il recupero del profilo"));
  }
};

/**
 * PATCH /api/host/profile
 * Aggiorna il profilo host
 * @access Private (authenticate + requireHost)
 */
const updateHost = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.userId;

    // Campi che possono essere aggiornati
    const allowedFields = [
      "businessName",
      "bio",
      "phone",
      "address",
      "bankAccount",
      "preferences",
    ];

    // Costruisci oggetto updates solo con campi permessi
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body.hasOwnProperty(field)) {
        if (field === "address" && req.body[field]) {
          updates[field] = normalizeAddress(req.body[field]);
        } else if (field === "bankAccount" && req.body[field]?.iban) {
          // Valida IBAN se viene aggiornato
          if (!validateIBAN(req.body[field].iban)) {
            throw createError(400, "Formato IBAN non valido");
          }
          updates[field] = {
            iban: req.body[field].iban.replace(/\s/g, "").toUpperCase(),
            accountHolder: req.body[field].accountHolder?.trim(),
            bankName: req.body[field].bankName?.trim(),
          };
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    // Verifica che ci siano campi da aggiornare
    if (Object.keys(updates).length === 0) {
      return next(createError(400, "Nessun campo valido da aggiornare"));
    }

    // Aggiungi timestamp
    updates.updatedAt = new Date();

    // Esegui aggiornamento
    const host = await Host.findOneAndUpdate(
      { user: userId },
      { $set: updates },
      {
        new: true,
        runValidators: true,
        select: "-__v",
      }
    ).populate("user", "name email");

    if (!host) {
      return next(createError(404, "Profilo host non trovato"));
    }

    // Log per audit
    console.log(`[HOST UPDATE] Host ${host._id} updated by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: "Profilo aggiornato con successo",
      data: host,
    });
  } catch (error) {
    console.error("[UPDATE HOST ERROR]", error);

    if (error.statusCode) {
      return next(error);
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return next(createError(400, "Errore di validazione", messages));
    }

    return next(createError(500, "Errore durante l'aggiornamento del profilo"));
  }
};

// ==================== HOST BOOKINGS ====================

/**
 * GET /api/host/bookings
 * Recupera tutte le prenotazioni degli annunci dell'host
 * @access Private (authenticate + requireHost)
 */
const getHostBookings = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.userId;
    const { status, page = 1, limit = 20 } = req.query;

    // Converti parametri in numeri
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Trova tutti gli ID degli annunci dell'host
    const [accommodations, experiences, coworkings] = await Promise.all([
      Accommodation.find({ owner: userId }).select("_id").lean(),
      Experience.find({ owner: userId }).select("_id").lean(),
      Coworking.find({ owner: userId }).select("_id").lean(),
    ]);

    const listingIds = [
      ...accommodations.map((a) => a._id),
      ...experiences.map((e) => e._id),
      ...coworkings.map((c) => c._id),
    ];

    if (listingIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Nessun annuncio pubblicato",
        data: {
          bookings: [],
          pagination: {
            total: 0,
            page: pageNum,
            limit: limitNum,
            pages: 0,
          },
        },
      });
    }

    // Costruisci query filtri
    const query = { listing: { $in: listingIds } };
    if (status) {
      query.status = status;
    }

    // Query con aggregazione per performance migliori
    const [bookings, totalCount] = await Promise.all([
      Booking.find(query)
        .populate("listing", "name title images")
        .populate("customer", "name email profilePicture")
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments(query),
    ]);

    // Arricchisci dati prenotazioni
    const enrichedBookings = bookings.map((booking) => ({
      id: booking._id,
      customer: {
        id: booking.customer?._id,
        name: booking.customer?.name || booking.customer_name || "N/D",
        email: booking.customer?.email || booking.customer_email || "N/D",
        profilePicture: booking.customer?.profilePicture,
      },
      listing: {
        id: booking.listing?._id,
        name: booking.listing?.name || booking.listing?.title || "N/D",
        type: booking.listingType || "accommodation",
        image: booking.listing?.images?.[0] || null,
      },
      dates: {
        checkin: booking.checkin || booking.startDate,
        checkout: booking.checkout || booking.endDate,
      },
      guests: booking.guests || booking.numberOfGuests || 1,
      pricing: {
        totalPrice: booking.totalPrice || booking.amount || 0,
        currency: "EUR",
      },
      status: booking.status,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        bookings: enrichedBookings,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("[GET HOST BOOKINGS ERROR]", error);
    return next(
      createError(500, "Errore durante il recupero delle prenotazioni")
    );
  }
};

// ==================== HOST LISTINGS ====================

/**
 * GET /api/host/listings
 * Recupera tutti gli annunci pubblicati dall'host
 * @access Private (authenticate + requireHost)
 */
const getHostListings = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.userId;
    const { type, status } = req.query;

    // Prepara queries basate sui filtri
    const baseQuery = { owner: userId };
    if (status) {
      baseQuery.status = status;
    }

    // Esegui query in parallelo
    const queries = [];

    if (!type || type === "accommodation") {
      queries.push(Accommodation.find(baseQuery).select("-__v").lean());
    } else {
      queries.push(Promise.resolve([]));
    }

    if (!type || type === "experience") {
      queries.push(Experience.find(baseQuery).select("-__v").lean());
    } else {
      queries.push(Promise.resolve([]));
    }

    if (!type || type === "coworking") {
      queries.push(Coworking.find(baseQuery).select("-__v").lean());
    } else {
      queries.push(Promise.resolve([]));
    }

    const [accommodations, experiences, coworkings] = await Promise.all(
      queries
    );

    // Normalizza struttura dati
    const listings = [
      ...accommodations.map((item) => ({
        id: item._id,
        name: item.name,
        description: item.description,
        price: item.price || item.price_per_night,
        images: item.images || [],
        mainImage: item.images?.[0] || null,
        type: "accommodation",
        status: item.status || "active",
        location: item.location,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      ...experiences.map((item) => ({
        id: item._id,
        name: item.name || item.title,
        description: item.description,
        price: item.price,
        images: item.images || [],
        mainImage: item.images?.[0] || null,
        type: "experience",
        status: item.status || "active",
        location: item.location,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      ...coworkings.map((item) => ({
        id: item._id,
        name: item.name || item.title,
        description: item.description,
        price: item.pricePerDay,
        images: item.images || [],
        mainImage: item.images?.[0] || null,
        type: "coworking",
        status: item.status || "active",
        location: item.location,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    ];

    // Ordina per data creazione (più recenti prima)
    listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      data: {
        listings,
        summary: {
          total: listings.length,
          accommodations: accommodations.length,
          experiences: experiences.length,
          coworkings: coworkings.length,
        },
      },
    });
  } catch (error) {
    console.error("[GET HOST LISTINGS ERROR]", error);
    return next(createError(500, "Errore durante il recupero degli annunci"));
  }
};

// ==================== HOST STATISTICS ====================

/**
 * GET /api/host/stats
 * Recupera statistiche dettagliate dell'host
 * @access Private (authenticate + requireHost)
 */
const getHostStats = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.userId;
    const { period = "all" } = req.query; // all, month, year

    // Calcola date per filtri periodo
    let dateFilter = {};
    const now = new Date();

    if (period === "month") {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { $gte: firstDayOfMonth } };
    } else if (period === "year") {
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
      dateFilter = { createdAt: { $gte: firstDayOfYear } };
    }

    // Trova tutti gli annunci
    const [accommodations, experiences, coworkings] = await Promise.all([
      Accommodation.find({ owner: userId }).select("_id status").lean(),
      Experience.find({ owner: userId }).select("_id status").lean(),
      Coworking.find({ owner: userId }).select("_id status").lean(),
    ]);

    const allListings = [...accommodations, ...experiences, ...coworkings];
    const listingIds = allListings.map((item) => item._id);

    // Statistiche annunci
    const activeListings = allListings.filter(
      (item) => item.status === "active"
    ).length;
    const totalListings = allListings.length;

    // Statistiche prenotazioni con aggregazione
    const bookingStats = await Booking.aggregate([
      {
        $match: {
          listing: { $in: listingIds },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $ifNull: ["$totalPrice", { $ifNull: ["$amount", 0] }],
            },
          },
        },
      },
    ]);

    // Elabora risultati aggregazione
    let totalBookings = 0;
    let totalRevenue = 0;
    let confirmedBookings = 0;
    let pendingBookings = 0;
    let cancelledBookings = 0;

    bookingStats.forEach((stat) => {
      totalBookings += stat.count;
      totalRevenue += stat.totalRevenue;

      if (stat._id === "confirmed" || stat._id === "completed") {
        confirmedBookings += stat.count;
      } else if (stat._id === "pending") {
        pendingBookings += stat.count;
      } else if (stat._id === "cancelled") {
        cancelledBookings += stat.count;
      }
    });

    // Calcola tasso di occupazione (stima)
    const occupancyRate =
      activeListings > 0
        ? Math.min(
            Math.round((confirmedBookings / (activeListings * 30)) * 100),
            100
          )
        : 0;

    // Calcola tasso di conversione
    const conversionRate =
      totalBookings > 0
        ? Math.round((confirmedBookings / totalBookings) * 100)
        : 0;

    // Media revenue per prenotazione
    const averageBookingValue =
      confirmedBookings > 0 ? (totalRevenue / confirmedBookings).toFixed(2) : 0;

    return res.status(200).json({
      success: true,
      data: {
        period,
        listings: {
          total: totalListings,
          active: activeListings,
          inactive: totalListings - activeListings,
          breakdown: {
            accommodations: accommodations.length,
            experiences: experiences.length,
            coworkings: coworkings.length,
          },
        },
        bookings: {
          total: totalBookings,
          confirmed: confirmedBookings,
          pending: pendingBookings,
          cancelled: cancelledBookings,
          conversionRate: `${conversionRate}%`,
        },
        revenue: {
          total: parseFloat(totalRevenue.toFixed(2)),
          currency: "EUR",
          averagePerBooking: parseFloat(averageBookingValue),
        },
        performance: {
          occupancyRate: `${occupancyRate}%`,
          responseRate: "N/D", // Da implementare con sistema messaggi
        },
      },
    });
  } catch (error) {
    console.error("[GET HOST STATS ERROR]", error);
    return next(
      createError(500, "Errore durante il calcolo delle statistiche")
    );
  }
};

// ==================== ADMIN: HOST VERIFICATION ====================

/**
 * PATCH /api/admin/hosts/:hostId/verify
 * Verifica o rifiuta un host (ADMIN ONLY)
 * @access Private (authenticate + requireAdmin)
 */
const verifyHost = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { hostId } = req.params;
    const { status, rejectionReason } = req.body;

    // Validazione status
    const validStatuses = ["active", "rejected"];
    if (!validStatuses.includes(status)) {
      await session.abortTransaction();
      return next(
        createError(
          400,
          `Status non valido. Valori ammessi: ${validStatuses.join(", ")}`
        )
      );
    }

    // Validazione ID
    if (!mongoose.Types.ObjectId.isValid(hostId)) {
      await session.abortTransaction();
      return next(createError(400, "ID host non valido"));
    }

    // Trova host
    const host = await Host.findById(hostId).session(session);
    if (!host) {
      await session.abortTransaction();
      return next(createError(404, "Host non trovato"));
    }

    // Verifica che l'host sia in stato pending
    if (host.status !== "pending") {
      await session.abortTransaction();
      return next(
        createError(
          400,
          `Impossibile verificare un host con status: ${host.status}`
        )
      );
    }

    // Aggiorna status host
    host.status = status;

    if (status === "active") {
      host.isVerified = true;
      host.verifiedAt = new Date();
      host.verifiedBy = req.user._id;
    } else if (status === "rejected") {
      host.isVerified = false;
      host.rejectionReason = rejectionReason || "Non specificato";
      host.rejectedAt = new Date();
      host.rejectedBy = req.user._id;
    }

    host.updatedAt = new Date();
    await host.save({ session });

    await session.commitTransaction();

    // Log per audit
    console.log(
      `[HOST VERIFICATION] Host ${hostId} ${status} by admin ${req.user._id}`
    );

    // TODO: Invia email notifica all'host
    // await sendHostVerificationEmail(host, status);

    return res.status(200).json({
      success: true,
      message: `Host ${
        status === "active" ? "verificato e attivato" : "rifiutato"
      } con successo`,
      data: {
        hostId: host._id,
        businessName: host.businessName,
        status: host.status,
        verifiedAt: host.verifiedAt,
        rejectionReason: host.rejectionReason,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("[VERIFY HOST ERROR]", error);
    return next(createError(500, "Errore durante la verifica dell'host"));
  } finally {
    session.endSession();
  }
};

/**
 * GET /api/admin/hosts/pending
 * Lista tutti gli host in attesa di verifica (ADMIN ONLY)
 * @access Private (authenticate + requireAdmin)
 */
const getPendingHosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [hosts, totalCount] = await Promise.all([
      Host.find({ status: "pending" })
        .populate("user", "name email profilePicture createdAt")
        .select("-__v")
        .sort({ createdAt: 1 }) // Più vecchi prima
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Host.countDocuments({ status: "pending" }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        hosts,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("[GET PENDING HOSTS ERROR]", error);
    return next(
      createError(500, "Errore durante il recupero degli host pendenti")
    );
  }
};

// ==================== EXPORTS ====================

module.exports = {
  // Host operations
  createHost,
  getHost,
  updateHost,

  // Host data
  getHostBookings,
  getHostListings,
  getHostStats,

  // Admin operations
  verifyHost,
  getPendingHosts,
};

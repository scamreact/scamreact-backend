// // ==================== ROUTES: booking.routes.js ====================
// const express = require("express");
// const router = express.Router();
// const { authenticate } = require("../middleware/auth.middleware");
// // const {
// //   updateBookingStatus,
// // } = require("../controllers/host.stripe.controller");
// const Booking = require("../models/booking.model");

// // // PATCH /bookings/:id/status - Aggiorna stato (già nel host.controller)
// // router.patch("/:id/status", authenticate, updateBookingStatus);

// // GET /bookings/:id - Dettaglio singola prenotazione
// router.get("/:id", authenticate, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const booking = await Booking.findById(id)
//       .populate("listing")
//       .populate("customer", "name email");

//     if (!booking) {
//       return res.status(404).json({ error: "Prenotazione non trovata" });
//     }

//     res.status(200).json({ success: true, booking });
//   } catch (error) {
//     console.error("Error fetching booking:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // POST /bookings - Crea nuova prenotazione
// router.post("/", authenticate, async (req, res) => {
//   try {
//     const {
//       listing,
//       listingType,
//       checkin,
//       checkout,
//       guests,
//       customer_name,
//       customer_email,
//       totalPrice,
//     } = req.body;

//     // Validazione base
//     if (!listing || !listingType || !checkin || !checkout || !totalPrice) {
//       return res.status(400).json({
//         error: "Campi obbligatori mancanti",
//         required: [
//           "listing",
//           "listingType",
//           "checkin",
//           "checkout",
//           "totalPrice",
//         ],
//       });
//     }

//     // Validazione date
//     const checkinDate = new Date(checkin);
//     const checkoutDate = new Date(checkout);
//     const now = new Date();
//     now.setHours(0, 0, 0, 0); // Reset ore per confronto

//     if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
//       return res.status(400).json({ error: "Date non valide" });
//     }

//     if (checkinDate >= checkoutDate) {
//       return res.status(400).json({
//         error: "La data di checkout deve essere successiva al checkin",
//       });
//     }

//     if (checkinDate < now) {
//       return res.status(400).json({
//         error: "Non puoi prenotare date passate",
//       });
//     }

//     // Validazione listingType
//     const validTypes = ["Accommodation", "Experience", "Coworking"];
//     if (!validTypes.includes(listingType)) {
//       return res.status(400).json({
//         error: "Tipo di listing non valido",
//         validTypes,
//       });
//     }

//     // Verifica che il listing esista
//     const ListingModel = mongoose.model(listingType);
//     const listingExists = await ListingModel.findById(listing);

//     if (!listingExists) {
//       return res.status(404).json({
//         error: `${listingType} non trovato`,
//       });
//     }

//     // Verifica che il listing sia attivo/disponibile
//     if (listingExists.status && listingExists.status !== "active") {
//       return res.status(400).json({
//         error: "Questo listing non è disponibile per prenotazioni",
//       });
//     }

//     // Verifica disponibilità (nessuna sovrapposizione di date)
//     const overlappingBooking = await Booking.findOne({
//       listing,
//       listingType,
//       status: { $in: ["pending", "confirmed"] },
//       $or: [
//         {
//           // Nuovo booking inizia durante un booking esistente
//           checkin: { $lt: checkoutDate },
//           checkout: { $gt: checkinDate },
//         },
//       ],
//     });

//     if (overlappingBooking) {
//       return res.status(409).json({
//         error: "Date non disponibili",
//         message: "Esiste già una prenotazione per queste date",
//         conflictingDates: {
//           checkin: overlappingBooking.checkin,
//           checkout: overlappingBooking.checkout,
//         },
//       });
//     }

//     // Verifica numero di ospiti (se il listing ha maxGuests)
//     if (listingExists.maxGuests && guests > listingExists.maxGuests) {
//       return res.status(400).json({
//         error: `Numero massimo di ospiti: ${listingExists.maxGuests}`,
//       });
//     }

//     // Crea il booking
//     const booking = await Booking.create({
//       listing,
//       listingType,
//       customer: req.user._id,
//       customer_name: customer_name || req.user.name,
//       customer_email: customer_email || req.user.email,
//       checkin: checkinDate,
//       checkout: checkoutDate,
//       startDate: checkinDate,
//       endDate: checkoutDate,
//       guests: guests || 1,
//       numberOfGuests: guests || 1,
//       totalPrice,
//       amount: totalPrice,
//       status: "pending",
//     });

//     // Popola i dati per la risposta
//     await booking.populate([
//       {
//         path: "customer",
//         select: "name email profilePicture",
//       },
//       {
//         path: "listing",
//         select: "title price location images",
//       },
//     ]);

//     res.status(201).json({
//       success: true,
//       message: "Prenotazione creata con successo",
//       booking,
//     });
//   } catch (error) {
//     console.error("Error creating booking:", error);

//     // Gestione errori specifici di Mongoose
//     if (error.name === "ValidationError") {
//       return res.status(400).json({
//         error: "Errore di validazione",
//         details: Object.values(error.errors).map((e) => e.message),
//       });
//     }

//     if (error.name === "CastError") {
//       return res.status(400).json({
//         error: "ID non valido",
//       });
//     }

//     res.status(500).json({
//       error: "Errore nella creazione della prenotazione",
//       message:
//         process.env.NODE_ENV === "development" ? error.message : undefined,
//     });
//   }
// });

// // GET /bookings/user/me - Prenotazioni dell'utente loggato
// router.get("/user/me", authenticate, async (req, res) => {
//   try {
//     const bookings = await Booking.find({ customer: req.user._id })
//       .populate("listing")
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: bookings.length,
//       bookings,
//     });
//   } catch (error) {
//     console.error("Error fetching user bookings:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // DELETE /bookings/:id - Cancella prenotazione (solo se pending)
// router.delete("/:id", authenticate, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const booking = await Booking.findById(id);

//     if (!booking) {
//       return res.status(404).json({ error: "Prenotazione non trovata" });
//     }

//     // Verifica ownership (cliente o host)
//     const isCustomer = booking.customer?.toString() === req.user._id.toString();
//     const listing = await booking.populate("listing");
//     const isHost =
//       listing?.listing?.owner?.toString() === req.user._id.toString();

//     if (!isCustomer && !isHost) {
//       return res.status(403).json({ error: "Non autorizzato" });
//     }

//     // Solo pending può essere cancellata
//     if (booking.status !== "pending") {
//       return res.status(400).json({
//         error: "Solo prenotazioni pending possono essere cancellate",
//       });
//     }

//     await booking.deleteOne();

//     res.status(200).json({
//       success: true,
//       message: "Prenotazione cancellata",
//     });
//   } catch (error) {
//     console.error("Error deleting booking:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;

// // ==================== ROUTES: booking.routes.js ====================
// const express = require("express");
// const router = express.Router();
// const mongoose = require("mongoose");
// const { authenticate } = require("../middleware/auth.middleware");
// const Booking = require("../models/booking.model");
// const {
//   sendBookingConfirmationEmail,
//   sendHostNotificationEmail,
//   sendBookingStatusUpdateEmail,
// } = require("../utils/booking/emailService");

// // GET /bookings/user/me - Prenotazioni dell'utente loggato
// // IMPORTANTE: Questa route deve stare PRIMA di /:id altrimenti "me" viene interpretato come ID
// router.get("/user/me", authenticate, async (req, res) => {
//   try {
//     const bookings = await Booking.find({ customer: req.user._id })
//       .populate("listing")
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: bookings.length,
//       bookings,
//     });
//   } catch (error) {
//     console.error("Error fetching user bookings:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // GET /bookings/:id - Dettaglio singola prenotazione
// router.get("/:id", authenticate, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const booking = await Booking.findById(id)
//       .populate("listing")
//       .populate("customer", "name email");

//     if (!booking) {
//       return res.status(404).json({ error: "Prenotazione non trovata" });
//     }

//     res.status(200).json({ success: true, booking });
//   } catch (error) {
//     console.error("Error fetching booking:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // POST /bookings - Crea nuova prenotazione con notifiche email
// router.post("/", authenticate, async (req, res) => {
//   try {
//     const {
//       listing,
//       listingType,
//       checkin,
//       checkout,
//       guests,
//       customer_name,
//       customer_email,
//       totalPrice,
//     } = req.body;

//     // Validazione base
//     if (!listing || !listingType || !checkin || !checkout || !totalPrice) {
//       return res.status(400).json({
//         error: "Campi obbligatori mancanti",
//         required: [
//           "listing",
//           "listingType",
//           "checkin",
//           "checkout",
//           "totalPrice",
//         ],
//       });
//     }

//     // Validazione date
//     const checkinDate = new Date(checkin);
//     const checkoutDate = new Date(checkout);
//     const now = new Date();
//     now.setHours(0, 0, 0, 0);

//     if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
//       return res.status(400).json({ error: "Date non valide" });
//     }

//     if (checkinDate >= checkoutDate) {
//       return res.status(400).json({
//         error: "La data di checkout deve essere successiva al checkin",
//       });
//     }

//     if (checkinDate < now) {
//       return res.status(400).json({
//         error: "Non puoi prenotare date passate",
//       });
//     }

//     // Validazione listingType
//     const validTypes = ["Accommodation", "Experience", "Coworking"];
//     if (!validTypes.includes(listingType)) {
//       return res.status(400).json({
//         error: "Tipo di listing non valido",
//         validTypes,
//       });
//     }

//     // Verifica che il listing esista e popola owner
//     const ListingModel = mongoose.model(listingType);
//     const listingData = await ListingModel.findById(listing).populate("owner");

//     if (!listingData) {
//       return res.status(404).json({
//         error: `${listingType} non trovato`,
//       });
//     }

//     // Verifica che il listing sia attivo
//     if (listingData.status && listingData.status !== "active") {
//       return res.status(400).json({
//         error: "Questo listing non è disponibile per prenotazioni",
//       });
//     }

//     // Verifica che l'utente non stia prenotando il proprio listing
//     if (
//       listingData.owner &&
//       listingData.owner._id.toString() === req.user._id.toString()
//     ) {
//       return res.status(400).json({
//         error: "Non puoi prenotare il tuo stesso listing",
//       });
//     }

//     // Verifica disponibilità (nessuna sovrapposizione di date)
//     const overlappingBooking = await Booking.findOne({
//       listing,
//       listingType,
//       status: { $in: ["pending", "confirmed"] },
//       $or: [
//         {
//           checkin: { $lt: checkoutDate },
//           checkout: { $gt: checkinDate },
//         },
//       ],
//     });

//     if (overlappingBooking) {
//       return res.status(409).json({
//         error: "Date non disponibili",
//         message: "Esiste già una prenotazione per queste date",
//         conflictingDates: {
//           checkin: overlappingBooking.checkin,
//           checkout: overlappingBooking.checkout,
//         },
//       });
//     }

//     // Verifica numero di ospiti
//     if (listingData.maxGuests && guests > listingData.maxGuests) {
//       return res.status(400).json({
//         error: `Numero massimo di ospiti: ${listingData.maxGuests}`,
//       });
//     }

//     // Crea il booking
//     const booking = await Booking.create({
//       listing,
//       listingType,
//       customer: req.user._id,
//       customer_name: customer_name || req.user.name,
//       customer_email: customer_email || req.user.email,
//       checkin: checkinDate,
//       checkout: checkoutDate,
//       startDate: checkinDate,
//       endDate: checkoutDate,
//       guests: guests || 1,
//       numberOfGuests: guests || 1,
//       totalPrice,
//       amount: totalPrice,
//       status: "pending",
//     });

//     // Popola i dati per la risposta
//     await booking.populate([
//       {
//         path: "customer",
//         select: "name email profilePicture",
//       },
//       {
//         path: "listing",
//         select: "title price location images owner",
//       },
//     ]);

//     // Invia email in background (non bloccante)
//     setImmediate(async () => {
//       try {
//         // Email al cliente
//         console.log("📧 Invio email di conferma al cliente...");
//         await sendBookingConfirmationEmail(booking, listingData);

//         // Email all'host
//         if (listingData.owner) {
//           console.log("📧 Invio notifica all'host...");
//           await sendHostNotificationEmail(
//             booking,
//             listingData,
//             listingData.owner,
//             req.user
//           );
//         }

//         console.log("✅ Email di notifica inviate con successo");
//       } catch (emailError) {
//         console.error(
//           "⚠️ Errore invio email (non bloccante):",
//           emailError.message
//         );
//         // Non bloccare la risposta se le email falliscono
//       }
//     });

//     res.status(201).json({
//       success: true,
//       message:
//         "Prenotazione creata con successo. Riceverai una email di conferma a breve.",
//       booking,
//     });
//   } catch (error) {
//     console.error("Error creating booking:", error);

//     // Gestione errori specifici di Mongoose
//     if (error.name === "ValidationError") {
//       return res.status(400).json({
//         error: "Errore di validazione",
//         details: Object.values(error.errors).map((e) => e.message),
//       });
//     }

//     if (error.name === "CastError") {
//       return res.status(400).json({
//         error: "ID non valido",
//       });
//     }

//     res.status(500).json({
//       error: "Errore nella creazione della prenotazione",
//       message:
//         process.env.NODE_ENV === "development" ? error.message : undefined,
//     });
//   }
// });

// // PATCH /bookings/:id/status - Aggiorna stato con notifica email
// router.patch("/:id/status", authenticate, async (req, res) => {
//   try {
//     const { status } = req.body;
//     const bookingId = req.params.id;

//     if (!["confirmed", "cancelled", "completed", "rejected"].includes(status)) {
//       return res.status(400).json({
//         error: "Status non valido",
//         validStatuses: ["confirmed", "cancelled", "completed", "rejected"],
//       });
//     }

//     const booking = await Booking.findById(bookingId)
//       .populate("customer", "name email")
//       .populate("listing");

//     if (!booking) {
//       return res.status(404).json({ error: "Prenotazione non trovata" });
//     }

//     // Verifica permessi
//     const ListingModel = mongoose.model(booking.listingType);
//     const listing = await ListingModel.findById(booking.listing._id).populate(
//       "owner"
//     );

//     if (!listing) {
//       return res.status(404).json({ error: "Listing non trovato" });
//     }

//     const isHost =
//       listing.owner && listing.owner._id.toString() === req.user._id.toString();
//     const isCustomer =
//       booking.customer &&
//       booking.customer._id.toString() === req.user._id.toString();

//     if (!isHost && !isCustomer) {
//       return res.status(403).json({
//         error: "Non autorizzato a modificare questa prenotazione",
//       });
//     }

//     // Solo l'host può confermare/rifiutare
//     if ((status === "confirmed" || status === "rejected") && !isHost) {
//       return res.status(403).json({
//         error: "Solo l'host può confermare o rifiutare prenotazioni",
//       });
//     }

//     // Solo l'host può segnare come completata
//     if (status === "completed" && !isHost) {
//       return res.status(403).json({
//         error: "Solo l'host può segnare una prenotazione come completata",
//       });
//     }

//     const oldStatus = booking.status;
//     booking.status = status;
//     await booking.save();

//     // Invia email di notifica cambio stato (in background)
//     if (oldStatus !== status) {
//       setImmediate(async () => {
//         try {
//           console.log(`📧 Invio email cambio stato: ${oldStatus} → ${status}`);
//           await sendBookingStatusUpdateEmail(booking, listing, status);
//           console.log("✅ Email cambio stato inviata");
//         } catch (emailError) {
//           console.error(
//             "⚠️ Errore invio email cambio stato:",
//             emailError.message
//           );
//         }
//       });
//     }

//     res.json({
//       success: true,
//       message: `Prenotazione ${status}. Email di notifica inviata al cliente.`,
//       booking,
//     });
//   } catch (error) {
//     console.error("Error updating booking status:", error);
//     res.status(500).json({ error: "Errore nell'aggiornamento dello stato" });
//   }
// });

// // DELETE /bookings/:id - Cancella prenotazione (solo se pending)
// router.delete("/:id", authenticate, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const booking = await Booking.findById(id);

//     if (!booking) {
//       return res.status(404).json({ error: "Prenotazione non trovata" });
//     }

//     // Verifica ownership (cliente o host)
//     const isCustomer = booking.customer?.toString() === req.user._id.toString();
//     await booking.populate("listing");

//     const ListingModel = mongoose.model(booking.listingType);
//     const listing = await ListingModel.findById(booking.listing._id);
//     const isHost = listing?.owner?.toString() === req.user._id.toString();

//     if (!isCustomer && !isHost) {
//       return res.status(403).json({ error: "Non autorizzato" });
//     }

//     // Solo pending può essere cancellata
//     if (booking.status !== "pending") {
//       return res.status(400).json({
//         error:
//           "Solo prenotazioni pending possono essere cancellate direttamente",
//         hint: "Usa PATCH /bookings/:id/status con status 'cancelled' per cancellare prenotazioni confermate",
//       });
//     }

//     await booking.deleteOne();

//     res.status(200).json({
//       success: true,
//       message: "Prenotazione cancellata",
//     });
//   } catch (error) {
//     console.error("Error deleting booking:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;

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

const express = require("express");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./connection/db.js");
const app = express();
const mongoose = require("mongoose");
const { initializePayoutScheduler } = require("./services/payout.service");

dotenv.config();
connectDB();

if (process.env.NODE_ENV === "development") {
  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    })
  );
} else {
  app.use(
    cors({
      origin: "https://vicuss.netlify.app",
      credentials: true,
    })
  );
}

app.use(
  express.static("public", {
    setHeaders: (res, path) => {
      if (path.endsWith(".jsx")) {
        res.setHeader("Content-Type", "application/javascript");
      }
    },
  })
);

// Middleware
app.use(cookieParser());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// Rotte
const adminRoutes = require("./routes/admin.routes.js");
const userRoutes = require("./routes/user.routes.js");
const authRoutes = require("./routes/auth.routes.js");
const borgoRoute = require("./routes/borgo.route.js");
const experienceRoutes = require("./routes/experience.routes.js");
const coworkingRoutes = require("./routes/coworking.routes.js");
const accommodationRoutes = require("./routes/accommodation.routes.js");
const chatRoutes = require("./routes/chat.js");
const stripeRoutes = require("./routes/stripe.routes.js");
const bookingRoutes = require("./routes/booking.routes.js");
const hostRoutes = require("./routes/host.routes");
const internetRoutes = require("./routes/internet.route.js");

app.use("/", authRoutes);
app.use("/user", userRoutes);
app.use("/admin", adminRoutes);
app.use("/borghi", borgoRoute);
app.use("/borghi/:param/accommodation", accommodationRoutes);
app.use("/borghi/:param/experience", experienceRoutes);
app.use("/borghi/:param/coworking", coworkingRoutes);
app.use("/borghi/:param/internet", internetRoutes);
app.use("/chat", chatRoutes);
app.use("/bookings", bookingRoutes);
app.use("/host", hostRoutes);

// Mount routes
app.use("/api", stripeRoutes);

// Body parser - IMPORTANTE: il webhook route usa raw body
app.use((req, res, next) => {
  if (req.originalUrl === "/api/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Endpoint di test
app.get("/api/test", (req, res) => {
  res.json({
    message: "API B&B Stripe funzionante",
    timestamp: new Date().toISOString(),
  });
});

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "API B&B Stripe funzionante",
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    message: "API B&B Stripe funzionante",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// // Payout automatici ogni lunedì alle 10:00
// const { processWeeklyPayouts } = require("./services/stripeService");
// cron.schedule("0 10 * * 1", async () => {
//   console.log("🔄 Avvio payout automatici settimanali...");
//   await processWeeklyPayouts();
// });

// Endpoint per ottenere traduzioni (API più chiara e non ambigua)
app.get("/translations/:lang", async (req, res) => {
  const { lang } = req.params;
  if (!SUPPORTED_LANGS.includes(lang)) {
    return res.status(400).json({ error: "Lingua non supportata" });
  }

  try {
    const translations = await Translation.find({});
    const formatted = {};

    translations.forEach((t) => {
      // assume che il documento abbia campi: key, it, en, de
      formatted[t.key] = t[lang] ?? t.it ?? ""; // fallback su it se mancante
    });

    res.json(formatted);
  } catch (error) {
    console.error("Errore caricando traduzioni:", error);
    res.status(500).json({ error: "Errore server" });
  }
});

// Handler per route non trovate
app.use((req, res) => {
  res.status(404).send({
    error: {
      message: "Risorsa non trovata",
      status: 404,
    },
  });
});

// ========================================
// PAYOUT SCHEDULER
// ========================================

// Inizializza scheduler payout automatici
if (process.env.ENABLE_AUTO_PAYOUTS === "true") {
  initializePayoutScheduler();
}

// Avvio del server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(
    `Server running on http://localhost:${port} in ${
      process.env.NODE_ENV || "development"
    } mode`
  );
  console.log("✅ MongoDB connected!");
  console.log("🚀 Server B&B API avviato");
  console.log(`📡 Porta: ${port}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `⏰ Auto-payouts: ${
      process.env.ENABLE_AUTO_PAYOUTS === "true" ? "Attivati" : "Disattivati"
    }`
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});

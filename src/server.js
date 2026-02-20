require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const reportsRouter = require("./routes/reports");

const app = express();
const PORT = process.env.PORT;
const PSW = process.env.PSW;

// ── Middleware ──────────────────────────────────
app.use(express.json({ limit: "20kb" })); // Limita payload

// CORS: accetta solo le origini configurate in .env
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Permetti richieste senza origin (es. Postman, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origine non consentita → ${origin}`));
      }
    },
    methods: ["GET", "POST"],
  }),
);

// ── Routes ──────────────────────────────────────
app.use("/api/reports", reportsRouter);

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// 404 catch-all
app.use((_req, res) => res.status(404).json({ error: "Rotta non trovata." }));

// ── MongoDB + avvio server ───────────────────────
async function startServer() {
  try {
    await mongoose.connect(
      `mongodb+srv://infoscamreact_db_user:${PSW}@scamreact.me91xzg.mongodb.net/?appName=scamreact`,
    );
    console.log("✅ MongoDB connesso");

    app.listen(PORT, () => {
      console.log(`🚀 Server in ascolto su http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Errore avvio:", err.message);
    process.exit(1);
  }
}

startServer();

const express = require("express");
const router = express.Router();
const Report = require("../models/Report");
const { redactSensitive } = require("../utils/redact");

// ────────────────────────────────────────────────
// POST /api/reports — Crea una nuova segnalazione
// ────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { message, scamType, channel, consentPublic } = req.body;

    // Validazione base
    if (!message || !scamType || !channel) {
      return res.status(400).json({ error: "Campi obbligatori mancanti." });
    }

    // Redazione server-side (secondo layer di sicurezza)
    const safeMessage = redactSensitive(message);

    if (safeMessage.length < 10) {
      return res.status(400).json({ error: "Messaggio troppo corto dopo la redazione." });
    }

    // Metadati anonimi dall'header (nessun IP salvato)
    const lang = (req.headers["accept-language"] || "").slice(0, 10);
    const ua = req.headers["user-agent"] || "";
    const browserFamily = detectBrowserFamily(ua);

    const report = new Report({
      message: safeMessage,
      scamType,
      channel,
      consentPublic: !!consentPublic,
      meta: { lang, browserFamily },
    });

    await report.save();

    res.status(201).json({ success: true, id: report._id });
  } catch (err) {
    console.error("Errore salvataggio report:", err.message);
    res.status(500).json({ error: "Errore interno del server." });
  }
});

// ────────────────────────────────────────────────
// GET /api/reports/stats — Statistiche aggregate (pubbliche)
// ────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [byType, byChannel, total] = await Promise.all([
      Report.aggregate([
        { $match: { consentPublic: true } },
        { $group: { _id: "$scamType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Report.aggregate([
        { $match: { consentPublic: true } },
        { $group: { _id: "$channel", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Report.countDocuments(),
    ]);

    res.json({ total, byType, byChannel });
  } catch (err) {
    console.error("Errore stats:", err.message);
    res.status(500).json({ error: "Errore interno del server." });
  }
});

// ────────────────────────────────────────────────
// GET /api/reports/recent — Ultimi 20 (solo pubblici)
// ────────────────────────────────────────────────
router.get("/recent", async (req, res) => {
  try {
    const reports = await Report.find({ consentPublic: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("scamType channel createdAt -_id"); // NO message per privacy

    res.json(reports);
  } catch (err) {
    console.error("Errore recent:", err.message);
    res.status(500).json({ error: "Errore interno del server." });
  }
});

// Helper: rileva solo la famiglia del browser (nessuna versione)
function detectBrowserFamily(ua) {
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua)) return "Safari";
  if (/Edge/i.test(ua)) return "Edge";
  return "Other";
}

module.exports = router;

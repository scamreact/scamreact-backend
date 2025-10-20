const Model = require("mongoose");
const mongoose = require("mongoose");
const { error } = require("console");
const Internet = require("../models/internet.model.js");
const Borgo = require("../models/borgo.model");

// Endpoint per aggiungere rete internet a un borgo
const createInternetData = async (req, res) => {
  try {
    const { param } = req.params; // <-- prende il parametro corretto dalla rotta
    const borgoId = param;
    console.log("borgoId ricevuto:", borgoId);

    if (!borgoId || !mongoose.Types.ObjectId.isValid(borgoId)) {
      return res.status(400).json({ error: "borgoId non valido" });
    }

    const borgo = await Borgo.findById(borgoId);
    console.log("Borgo trovato:", borgo);

    if (!borgo) return res.status(404).json({ error: "Borgo non trovato" });

    const internet = await Internet.create({
      ...req.body,
      borgo: borgo._id,
    });

    res.status(201).json({ success: true, data: internet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Funzione di utilità per trovare borgo per id o slug
const getInternetData = async (req, res) => {
  try {
    console.log("req.params:", req.params);
    const { param } = req.params;
    let borgoId;

    // Determina borgoId (da ObjectId o da nome)
    if (/^[0-9a-fA-F]{24}$/.test(param)) {
      borgoId = param;
    } else {
      const borgo = await Borgo.findOne({
        name: new RegExp(`^${param}$`, "i"),
      });
      if (!borgo) {
        return res.status(404).json({ error: "Borgo non trovato" });
      }
      borgoId = borgo._id;
    }

    // Trova borgo e internet (usando findOne invece di find)
    const [borgo, internet] = await Promise.all([
      Borgo.findById(borgoId),
      Internet.findOne({ borgo: borgoId }),
    ]);

    if (!borgo) {
      return res.status(404).json({ error: "Borgo non trovato" });
    }

    // Log per debug
    console.log("dati internet:", internet);

    // Risposta OK - restituisce direttamente l'oggetto (o null se non esiste)
    return res.status(200).json(internet);
  } catch (err) {
    console.error("getInternetData error", err);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * UPDATE (partial)
 * PATCH /borghi/:_id/internet
 * body: qualunque subset dei campi internet
 * Se borgo o internet non esistono -> 404
 */
const updateInternetData = async (req, res) => {
  try {
    const { _id } = req.params;
    const payload = req.body;

    if (!_id) return res.status(400).json({ error: "Missing borgo id" });
    if (!payload || Object.keys(payload).length === 0)
      return res.status(400).json({ error: "Nessun campo da aggiornare." });

    const borgo = await findBorgoByIdentifier(_id);
    if (!borgo) return res.status(404).json({ error: "Borgo non trovato." });
    if (!borgo.internet)
      return res
        .status(404)
        .json({ error: "Dati internet non presenti per questo borgo." });

    // Aggiorna solo campi permessi
    const allowed = [
      "downloadSpeed",
      "uploadSpeed",
      "latency",
      "fiberOptic",
      "adsl",
      "mobile4G",
      "mobile5G",
      "providers",
      "notes",
      "coworkingSpaces",
      "qualityScore",
      "lastUpdated",
    ];

    allowed.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        // type coercion minima
        if (
          ["downloadSpeed", "uploadSpeed", "latency", "qualityScore"].includes(
            field
          )
        ) {
          borgo.internet[field] =
            payload[field] !== null ? Number(payload[field]) : payload[field];
        } else if (field === "providers") {
          borgo.internet.providers = Array.isArray(payload.providers)
            ? payload.providers
            : String(payload.providers)
                .split(",")
                .map((s) => s.trim());
        } else if (field === "lastUpdated") {
          borgo.internet.lastUpdated = payload.lastUpdated
            ? new Date(payload.lastUpdated)
            : new Date();
        } else if (
          ["fiberOptic", "adsl", "mobile4G", "mobile5G"].includes(field)
        ) {
          borgo.internet[field] = !!payload[field];
        } else {
          borgo.internet[field] = payload[field];
        }
      }
    });

    // Aggiorna sempre lastUpdated se non fornito
    if (!payload.lastUpdated) borgo.internet.lastUpdated = new Date();

    await borgo.save();

    return res.json({
      borgo: { _id: borgo._id, name: borgo.name, slug: borgo.slug },
      internet: borgo.internet,
    });
  } catch (err) {
    console.error("updateInternetData error", err);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * DELETE
 * DELETE /borghi/:_id/internet
 * Rimuove il subdocument internet dal borgo
 */
const deleteInternetData = async (req, res) => {
  try {
    const { _id } = req.params;
    if (!_id) return res.status(400).json({ error: "Missing borgo id" });

    const borgo = await findBorgoByIdentifier(_id);
    if (!borgo) return res.status(404).json({ error: "Borgo non trovato." });
    if (!borgo.internet)
      return res
        .status(404)
        .json({ error: "Dati internet non presenti per questo borgo." });

    borgo.internet = undefined;
    await borgo.save();

    return res.status(200).json({
      message: "Dati internet cancellati correttamente.",
      borgo: { _id: borgo._id, name: borgo.name, slug: borgo.slug },
    });
  } catch (err) {
    console.error("deleteInternetData error", err);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

module.exports = {
  getInternetData,
  createInternetData,
  updateInternetData,
  deleteInternetData,
};

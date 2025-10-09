const mongoose = require("mongoose");
const Coworking = require("../models/coworking.model");
const Borgo = require("../models/borgo.model.js");

// Endpoint per aggiungere un coworking a un borgo
const createCoworking = async (req, res) => {
  try {
    const { param } = req.params;
    console.log("param ricevuto:", param);
    console.log("Body:", req.body);

    if (!param) {
      return res.status(400).json({ error: "param mancante" });
    }

    let borgo = null;

    // Se è un ObjectId valido, cerca per ID
    if (/^[0-9a-fA-F]{24}$/.test(param)) {
      borgo = await Borgo.findById(param);
    } else {
      // Altrimenti cerca per nome (case insensitive)
      borgo = await Borgo.findOne({ name: new RegExp(`^${param}$`, "i") });
    }

    console.log("Borgo trovato:", borgo);

    if (!borgo) {
      return res.status(404).json({ error: "Borgo non trovato" });
    }

    const coworking = await Coworking.create({
      ...req.body,
      borgo: borgo._id,
    });

    res.status(201).json({ success: true, data: coworking });
  } catch (error) {
    console.error("Errore createCoworking:", error);
    res.status(500).json({ error: error.message });
  }
};

const getCoworking = async (req, res) => {
  try {
    const { param } = req.params;

    // Se è un ObjectId valido → cerca per id
    if (/^[0-9a-fA-F]{24}$/.test(param)) {
      const coworking = await Coworking.findById(param);
      if (!coworking) {
        return res.status(404).json({ message: "Co-working non trovato" });
      }
      return res.json(coworking);
    }

    // Altrimenti cerca per nome (case insensitive)
    const coworking = await Coworking.findOne({
      name: new RegExp(`^${param}$`, "i"),
    });
    if (!coworking) {
      return res.status(404).json({ message: "Co-working non trovato" });
    }

    res.status(200).json(coworking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Endpoint per ottenere tutti i coworking di un borgo
const getCoworkings = async (req, res) => {
  try {
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

    // Trova borgo e coworkings
    const [borgo, coworkings] = await Promise.all([
      Borgo.findById(borgoId),
      Coworking.find({ borgo: borgoId }),
    ]);

    if (!borgo) {
      return res.status(404).json({ error: "Borgo non trovato" });
    }

    res.status(200).json({
      success: true,
      borgo: borgo,
      coworking: coworkings,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Endpoint per aggiornare un coworking
const updateCoworking = async (req, res) => {
  try {
    const { _id } = req.params;

    if (!_id) {
      return res.status(400).json({ error: "Coworking ID is required" });
    }

    const coworking = await Coworking.findByIdAndUpdate(_id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!coworking) {
      return res.status(404).json({ message: "Coworking not found" });
    }

    res.status(200).json(coworking);
  } catch (error) {
    console.error("Error updating Coworking:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Endpoint per cancellare un coworking
const deleteCoworking = async (req, res) => {
  try {
    const { _id } = req.params;
    const coworking = await Coworking.findByIdAndDelete(_id);

    if (!coworking) {
      return res.status(404).json({ message: "Coworking not found!" });
    }

    res.status(200).json({ message: "Coworking deleted successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

module.exports = {
  createCoworking,
  getCoworking,
  getCoworkings,
  deleteCoworking,
  updateCoworking,
};

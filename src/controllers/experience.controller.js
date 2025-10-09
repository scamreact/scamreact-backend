const Model = require("mongoose");
const mongoose = require("mongoose");
const { error } = require("console");
const Experience = require("../models/experience.model");
const Borgo = require("../models/borgo.model.js");

// Endpoint per aggiungere un'esperienza
const createExperience = async (req, res) => {
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

    const experience = await Experience.create({
      ...req.body,
      borgo: borgo._id,
    });

    res.status(201).json({ success: true, data: experience });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

const getExperience = async (req, res) => {
  try {
    const { param } = req.params;

    // Se è un ObjectId valido → cerca per id
    if (/^[0-9a-fA-F]{24}$/.test(param)) {
      const experience = await Experience.findById(param);
      if (!experience)
        return res.status(404).json({ message: "Esperienza non trovata" });
      return res.json(experience);
    }

    // Altrimenti cerca per nome (case insensitive)
    const experience = await Experience.findOne({
      name: new RegExp(param, "i"),
    });
    if (!experience)
      return res.status(404).json({ message: "Esperienza non trovata" });

    // Risposta OK
    res.status(200).json(experience);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Endpoint per ottenere tutte le esperienze (opzionalmente filtrate per borgo)
const getExperiences = async (req, res) => {
  try {
    console.log("req.params:", req.params);
    console.log("param ricevuto:", req.params.param);

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

    // Trova borgo e experiences
    const [borgo, experience] = await Promise.all([
      Borgo.findById(borgoId),
      Experience.find({ borgo: borgoId }),
    ]);

    if (!borgo) {
      return res.status(404).json({ error: "Borgo non trovato" });
    }

    res.status(200).json({
      success: true,
      borgo: borgo,
      experience: experience,
    });
    // Nel controller, aggiungi questo log
    console.log("Experiences trovate:", experience.length);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Endopoint per aggiornare un'esperienza
const updateExperience = async (req, res) => {
  try {
    const { _id } = req.params;
    const {
      name,
      place,
      place_description,
      description,
      imgURL,
      internet,
      priceHouses,
      airbnbFilter,
      hospital,
      app,
      school,
      district,
      airport,
      coworking,
    } = req.body;
    const experience = await Experience.findByIdAndUpdate(
      _id,
      {
        name,
        place,
        place_description,
        description,
        imgURL,
        internet,
        priceHouses,
        airbnbFilter,
        hospital,
        app,
        school,
        district,
        airport,
        coworking,
      },
      { new: true }
    );
    if (!experience) {
      return res.status(404).json({ message: "Epxerience not found" });
    }

    if (!_id) {
      return res.status(400).json({ error: "Epxerience ID is required" });
    }

    const updateExperience = await Experience.findById(_id);
    res.status(200).json(updateExperience);
  } catch (error) {
    console.error("Error updating Experience:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Endopoint per cancellare un'esperienza
const deleteExperience = async (req, res) => {
  try {
    const { _id } = req.params;
    const experience = await Experience.findByIdAndDelete(_id);
    if (!experience) {
      return res.status(404).json({ message: "experience not found!" }); // aggiunto un return
    }
    res.status(200).json({ message: "experience deleted successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

module.exports = {
  createExperience,
  getExperience,
  getExperiences,
  deleteExperience,
  updateExperience,
};

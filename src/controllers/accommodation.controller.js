const Model = require("mongoose");
const mongoose = require("mongoose");
const { error } = require("console");
const Accommodation = require("../models/accommodation.model.js");
const Borgo = require("../models/borgo.model.js");

// Endpoint per aggiungere un alloggio
const createAccommodation = async (req, res) => {
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

    const accommodation = await Accommodation.create({
      ...req.body,
      borgo: borgo._id,
    });

    res.status(201).json({ success: true, data: accommodation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const getAccommodation = async (req, res) => {
  try {
    const { param } = req.params;

    // Se è un ObjectId valido → cerca per id
    if (/^[0-9a-fA-F]{24}$/.test(param)) {
      const accommodation = await Accommodation.findById(param);
      if (!accommodation)
        return res.status(404).json({ message: "Alloggio non trovato" });
      return res.json(accommodation);
    }

    // Altrimenti cerca per nome (case insensitive)
    const accommodation = await Accommodation.findOne({
      name: new RegExp(param, "i"),
    });
    if (!accommodation)
      return res.status(404).json({ message: "Borgo non trovato" });

    // Risposta OK
    res.status(200).json(accommodation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Endpoint per mostrare gli alloggi di un borgo
const getAccommodations = async (req, res) => {
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

    // Trova borgo e accommodations
    const [borgo, accommodations] = await Promise.all([
      Borgo.findById(borgoId),
      Accommodation.find({ borgo: borgoId }),
    ]);

    if (!borgo) {
      return res.status(404).json({ error: "Borgo non trovato" });
    }

    res.status(200).json({
      success: true,
      borgo: borgo,
      accomodation: accommodations,
    });
    // Nel controller, aggiungi questo log
    console.log("accommodations trovate:", accommodations.length);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Rotta per ottenere i borghi aggiuntivi
const loadMoreAccommodations = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1; // Imposta la pagina predefinita a 1 se non specificata
    limit = parseInt(limit) || 5; // Imposta il limite predefinito a 5 se non specificato

    const totalBorghiCount = await Accommodation.countDocuments(); // Conta il totale dei borghi
    const skip = (page - 1) * limit; // Calcola quanti documenti saltare

    const borghi = await Accommodation.find({}).limit(limit).skip(skip); // Ottieni i borghi con paginazione

    res.status(200).json({
      borghi,
      currentPage: page,
      totalPages: Math.ceil(totalBorghiCount / limit),
      totalBorghi: totalBorghiCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Endopoint per aggiornare un borgo
const updateAccommodation = async (req, res) => {
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
    const accommodation = await Accommodation.findByIdAndUpdate(
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
    if (!accommodation) {
      return res.status(404).json({ message: "Accomodation not found" });
    }

    if (!_id) {
      return res.status(400).json({ error: "Borgo ID is required" });
    }

    const updateAccomodation = await Accomodation.findById(_id);
    res.status(200).json(updateAccomodation);
  } catch (error) {
    console.error("Error updating Borgo:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Endopoint per cancellare un borgo
const deleteAccommodation = async (req, res) => {
  try {
    const { _id } = req.params;
    const accommodation = await Accommodation.findByIdAndDelete(_id);
    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found!" }); // aggiunto un return
    }
    res.status(200).json({ message: "Accommodation deleted successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

module.exports = {
  createAccommodation,
  getAccommodation,
  getAccommodations,
  loadMoreAccommodations,
  updateAccommodation,
  deleteAccommodation,
};

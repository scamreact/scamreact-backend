const Model = require("mongoose");
const mongoose = require("mongoose");
const { error } = require("console");
const Borgo = require("../models/borgo.model");

// Endpoint per aggiungere un borgo
const createBorgo = async (req, res) => {
  try {
    const borgo = await Borgo.create(req.body);
    res.status(200).json({ success: true, data: borgo });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

const getBorgo = async (req, res) => {
  try {
    const { param } = req.params;

    // Se è un ObjectId valido → cerca per id
    if (/^[0-9a-fA-F]{24}$/.test(param)) {
      const borgo = await Borgo.findById(param);
      if (!borgo) return res.status(404).json({ message: "Borgo non trovato" });
      return res.json(borgo);
    }

    // Altrimenti cerca per nome (case insensitive)
    const borgo = await Borgo.findOne({ name: new RegExp(param, "i") });
    if (!borgo) return res.status(404).json({ message: "Borgo non trovato" });

    // Risposta OK
    res.status(200).json(borgo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Endpoint per mostrare i borghi con paginazione
const getBorghi = async (req, res) => {
  try {
    let { limit, offset } = req.query;
    limit = parseInt(limit) || 50; // imposta il limite a 5 se non definito
    offset = parseInt(offset) || 0; // imposta l'offset a 0 se non definito
    const totalBorghiCount = await Borgo.countDocuments(); // Conta il totale dei borghi
    const borghi = await Borgo.find({}).limit(limit).skip(offset); // Ottieni i borghi con paginazione
    res.status(200).json({
      borghi,
      currentPage: Math.floor(offset / limit) + 1, // Calcola la pagina corrente
      totalPages: Math.ceil(totalBorghiCount / limit), // Calcola il numero totale di pagine
      totalBorghi: totalBorghiCount,
    });
    // try {
    //   const borghi = await Borgo.find();
    //   res.status(200).json(borghi);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

// Rotta per ottenere i borghi aggiuntivi
const loadMoreBorghi = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1; // Imposta la pagina predefinita a 1 se non specificata
    limit = parseInt(limit) || 5; // Imposta il limite predefinito a 5 se non specificato

    const totalBorghiCount = await Borgo.countDocuments(); // Conta il totale dei borghi
    const skip = (page - 1) * limit; // Calcola quanti documenti saltare

    const borghi = await Borgo.find({}).limit(limit).skip(skip); // Ottieni i borghi con paginazione

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
const updateBorgo = async (req, res) => {
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
    const borgo = await Borgo.findByIdAndUpdate(
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
    // const borgo = await Borgo.findByIdAndUpdate(_id, { new: true });
    if (!borgo) {
      return res.status(404).json({ message: "Borgo not found" });
    }

    if (!_id) {
      return res.status(400).json({ error: "Borgo ID is required" });
    }

    const updateBorgo = await Borgo.findById(_id);
    res.status(200).json(updateBorgo);
  } catch (error) {
    console.error("Error updating Borgo:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Endopoint per cancellare un borgo
const deleteBorgo = async (req, res) => {
  try {
    const { _id } = req.params;
    const borgo = await Borgo.findByIdAndDelete(_id);
    if (!borgo) {
      return res.status(404).json({ message: "Borgo not found!" }); // aggiunto un return
    }
    res.status(200).json({ message: "Borgo deleted successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

module.exports = {
  createBorgo,
  getBorgo,
  getBorghi,
  updateBorgo,
  deleteBorgo,
  loadMoreBorghi,
};

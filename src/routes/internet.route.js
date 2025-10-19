const express = require("express");
const Internet = require("../models/internet.model.js");
const router = express.Router({ mergeParams: true }); // 🔑 importante
const {
  getInternetData,
  createInternetData,
  updateInternetData,
  deleteInternetData,
} = require("../controllers/internet.controller");

// Endpoint per ottenere i dati di connettività internet di un borgo
router.get("/", getInternetData);
router.post("/", createInternetData);
router.put("/:_id", updateInternetData);
router.delete("/:_id", deleteInternetData);

module.exports = router;

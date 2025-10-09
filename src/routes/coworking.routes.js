const express = require("express");
const Coworking = require("../models/coworking.model.js");
const router = express.Router({ mergeParams: true }); // 🔑 importante;

const {
  createCoworking,
  getCoworking,
  getCoworkings,
  updateCoworking,
  deleteCoworking,
} = require("../controllers/coworking.controller.js");

router.post("/", createCoworking);
router.get("/:param", getCoworking); // ricerca per nome o per _id
router.get("/", getCoworkings);
router.put("/:_id", updateCoworking);
router.delete("/:_id", deleteCoworking);

module.exports = router;

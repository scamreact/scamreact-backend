const express = require("express");
const Experience = require("../models/experience.model.js");
const router = express.Router({ mergeParams: true }); // 🔑 importante;
const {
  createExperience,
  getExperience,
  updateExperience,
  deleteExperience,
} = require("../controllers/experience.controller.js");

router.post("/", createExperience);
router.get("/:_id", getExperience); // ricerca per _id
router.put("/:_id", updateExperience);
router.delete("/:_id", deleteExperience);

module.exports = router;

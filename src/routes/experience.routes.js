const express = require("express");
const Experience = require("../models/experience.model.js");
const router = express.Router({ mergeParams: true }); // 🔑 importante;

const {
  createExperience,
  getExperience,
  getExperiences,
  updateExperience,
  deleteExperience,
} = require("../controllers/experience.controller.js");

router.post("/", createExperience);
router.get("/:param", getExperience); // ricerca per nome o per _id
router.get("/", getExperiences);
router.put("/:_id", updateExperience);
router.delete("/:_id", deleteExperience);

module.exports = router;

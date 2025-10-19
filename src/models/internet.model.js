const mongoose = require("mongoose");
const { Schema } = mongoose;

const internetSchema = new Schema({
  downloadSpeed: { type: Number }, // Mbps
  uploadSpeed: { type: Number }, // Mbps
  latency: { type: Number }, // ms
  fiberOptic: { type: Boolean, default: false },
  adsl: { type: Boolean, default: false },
  mobile4G: { type: Boolean, default: false },
  mobile5G: { type: Boolean, default: false },
  providers: { type: [String], default: [] },
  notes: { type: String },
  coworkingSpaces: { type: String },
  lastUpdated: { type: Date, default: Date.now },
  qualityScore: { type: Number }, // optional aggregated score
  borgo: { type: mongoose.Schema.Types.ObjectId, ref: "Borgo", required: true }, // 🔗 collegamento
});

const Internet = mongoose.model("Internet", internetSchema);

module.exports = Internet;

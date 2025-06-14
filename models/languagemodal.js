const mongoose = require("mongoose");

const languageSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
},
{ timestamps: true }
)

module.exports = mongoose.model("Language", languageSchema);
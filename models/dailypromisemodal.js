const mongoose = require('mongoose');

const dailyPromiseSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  text: { type: String, required: true, trim: true },
  telugu: { type: String, default: '', trim: true },
  englishReference: { type: String, default: '' },
  teluguReference: { type: String, default: '' },
  imageUrlEnglish: { type: String, required: true },
  imageUrlTelugu: { type: String, required: true }
}, { timestamps: true, collection: 'dailypromises' });

module.exports = mongoose.model('DailyPromise', dailyPromiseSchema); 
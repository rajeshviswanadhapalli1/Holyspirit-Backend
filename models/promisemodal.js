const mongoose = require('mongoose');

const promiseSchema = new mongoose.Schema({
  day: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 365,
    unique: true 
  },
  date: { 
    type: String, 
    required: true 
  },
  english: { 
    type: String, 
    required: true,
    trim: true 
  },
  telugu: { 
    type: String, 
    default: '',
    trim: true 
  },
  reference: { 
    type: String, 
    default: '' 
  },
  englishReference: { type: String, default: '' },
  teluguReference: { type: String, default: '' },
  imageUrlEnglish: { type: String, default: '' },
  imageUrlTelugu: { type: String, default: '' }
}, { timestamps: true });

// Add index for better query performance
promiseSchema.index({ day: 1 });

module.exports = mongoose.model('Promise', promiseSchema);
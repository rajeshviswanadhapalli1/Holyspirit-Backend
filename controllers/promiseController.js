const cloudinary = require('cloudinary').v2;
const DailyPromise = require('../models/dailypromisemodal');
require('dotenv').config();

// const translate = new Translate({ key: process.env.GOOGLE_API_KEY });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});



// Save a daily promise from formData
exports.saveDailyPromise = async (req, res) => {
  try {
    const { date, text, telugu, englishReference, teluguReference } = req.body;
    // Get files from multer
    const englishFile = req.files && req.files['imageUrlEnglish'] ? req.files['imageUrlEnglish'][0] : null;
    const teluguFile = req.files && req.files['imageUrlTelugu'] ? req.files['imageUrlTelugu'][0] : null;

    if (!date || !text || !englishFile || !teluguFile) {
      return res.status(400).json({ error: 'date, text, imageUrlEnglish, and imageUrlTelugu files are required' });
    }

    // Upload English image to Cloudinary
    const englishUpload = await cloudinary.uploader.upload_stream_async
      ? await cloudinary.uploader.upload_stream_async({ resource_type: 'image' }, englishFile.buffer)
      : await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({ resource_type: 'image' }, (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
          stream.end(englishFile.buffer);
        });
    const imageUrlEnglish = englishUpload.secure_url;

    // Upload Telugu image to Cloudinary
    const teluguUpload = await cloudinary.uploader.upload_stream_async
      ? await cloudinary.uploader.upload_stream_async({ resource_type: 'image' }, teluguFile.buffer)
      : await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({ resource_type: 'image' }, (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
          stream.end(teluguFile.buffer);
        });
    const imageUrlTelugu = teluguUpload.secure_url;

    const dailyPromise = new DailyPromise({
      date,
      text,
      telugu: telugu || '',
      englishReference: englishReference || '',
      teluguReference: teluguReference || '',
      imageUrlEnglish,
      imageUrlTelugu
    });
    const saved = await dailyPromise.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('❌ Error in saveDailyPromise:', err);
    res.status(500).json({ error: 'Failed to save daily promise', details: err.message });
  }
};

// Get all daily promises with pagination
exports.getAllDailyPromisesPaginated = async (req, res) => {
  try {

    const dailyPromises = await DailyPromise.find()
console.log(dailyPromises,'dailyPromises');

    res.status(200).json({
      data: dailyPromises
    });
  } catch (err) {
    console.error('❌ Error in getAllDailyPromisesPaginated:', err);
    res.status(500).json({ error: 'Failed to fetch daily promises', details: err.message });
  }
};

// Get daily promise by specific date
exports.getDailyPromiseByDate = async (req, res) => {
  console.log('backend API calling');
  
  try {
    const { date } = req.query;
    console.log(date,'date');
    
    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required' });
    }
    const dailyPromise = await DailyPromise.findOne({ date });
    console.log(dailyPromise,'dailyPromise');
    
    if (!dailyPromise) {
      return res.status(404).json({ error: 'No daily promise found for the given date' });
    }
    res.status(200).json({data:dailyPromise});
  } catch (err) {
    console.error('❌ Error in getDailyPromiseByDate:', err);
    res.status(500).json({ error: 'Failed to fetch daily promise', details: err.message });
  }
};

// Get daily promise image by date + selected language (english/telugu)
exports.getDailyPromiseImageByDate = async (req, res) => {
  try {
    const { date, language } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required' });
    }

    const lang = String(language || 'english').trim().toLowerCase();
    const normalizedLang =
      lang === 'en' || lang === 'eng' || lang === 'english' ? 'english'
      : lang === 'te' || lang === 'tel' || lang === 'telugu' ? 'telugu'
      : null;

    if (!normalizedLang) {
      return res.status(400).json({ error: 'language must be english/en or telugu/te' });
    }

    const dailyPromise = await DailyPromise.findOne({ date });
    if (!dailyPromise) {
      return res.status(404).json({ error: 'No daily promise found for the given date' });
    }

    const imageUrl =
      normalizedLang === 'english' ? dailyPromise.imageUrlEnglish : dailyPromise.imageUrlTelugu;

    if (!imageUrl) {
      return res.status(404).json({ error: `No ${normalizedLang} image found for the given date` });
    }

    res.status(200).json({
      date: dailyPromise.date,
      language: normalizedLang,
      imageUrl,
      reference:
        normalizedLang === 'english' ? dailyPromise.englishReference : dailyPromise.teluguReference,
      text: normalizedLang === 'english' ? dailyPromise.text : dailyPromise.telugu,
    });
  } catch (err) {
    console.error('❌ Error in getDailyPromiseImageByDate:', err);
    res.status(500).json({ error: 'Failed to fetch daily promise image', details: err.message });
  }
};

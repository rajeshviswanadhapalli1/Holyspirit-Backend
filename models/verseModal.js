const mongoose = require('mongoose');

const VerseSchema = new mongoose.Schema({
  languageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language',
    required: true,
  },
  testamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Testament',
    required: true,
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
  },
  chapterName: {
    type: String,
    required: true,
  },
  chapterIndex: {
    type: Number,
    required: true,
  },
  verseCount: {
    type: Number,
    required: true,
  },
  verses: [
    {
      index: { type: Number, required: true },
      text: { type: String, required: false },
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Verse', VerseSchema);

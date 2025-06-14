const express = require('express');
// const { addLanguage,getLanguages, deleteLanguage, updateLanguage } = require('../controllers/languageController');
const { protect } = require('../middlewares/authMiddleware');
const { addVerses, getVersesByFilters } = require('../controllers/verseController');
const router = express.Router();

router.post('/add-verses', protect, addVerses);
router.get('/verses/:languageId/:testamentId/:bookId/:chapterIndex', getVersesByFilters);


module.exports = router;



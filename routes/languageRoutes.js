const express = require('express');
const { addLanguage,getLanguages, deleteLanguage, updateLanguage } = require('../controllers/languageController');
const { protect } = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/add-Language', protect, addLanguage);
router.get('/languages', protect, getLanguages)
router.put('/languages/:id', protect, updateLanguage);
router.delete('/languages/:id', protect, deleteLanguage);


module.exports = router;



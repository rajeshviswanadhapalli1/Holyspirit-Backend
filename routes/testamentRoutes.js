const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { addTestment, getAllTestaments, deleteTestament, updateTestament, getTestamentsByLanguage } = require('../controllers/testamentController');
const router = express.Router();

router.post('/add-Testament', protect, addTestment);
router.get('/allTestaments', protect, getAllTestaments);
router.put('/testaments/:id', protect, updateTestament);
router.delete('/testaments/:id', protect, deleteTestament);
router.get('/by-language/:languageId', getTestamentsByLanguage);

module.exports = router;



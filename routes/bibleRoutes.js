const express = require('express');
const router = express.Router();

const { voiceSearch } = require('../controllers/voiceSearchController');

// Voice search (English + Telugu)
router.post('/voice-search', voiceSearch);

module.exports = router;


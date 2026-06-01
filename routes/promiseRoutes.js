const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/adminMiddleware');
const {
  sendDailyPromiseNow,
  getBroadcastStatus,
  getDailyDeliveryReport,
} = require('../controllers/dailyPromiseBroadcastController');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });


router.post('/daily-promise', upload.fields([
  { name: 'imageUrlEnglish', maxCount: 1 },
  { name: 'imageUrlTelugu', maxCount: 1 }
]), require('../controllers/promiseController').saveDailyPromise);
router.get('/daily-promises-paginated', protect, require('../controllers/promiseController').getAllDailyPromisesPaginated);
router.get('/daily-promise-by-date', require('../controllers/promiseController').getDailyPromiseByDate);
router.get('/daily-promise-image', require('../controllers/promiseController').getDailyPromiseImageByDate);

router.post('/broadcast-daily-now', protect, requireAdmin, sendDailyPromiseNow);
router.get('/broadcast-status', protect, requireAdmin, getBroadcastStatus);
router.get('/daily-delivery-report', protect, requireAdmin, getDailyDeliveryReport);

module.exports = router;
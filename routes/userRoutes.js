const express = require('express');
const multer = require('multer');
const {toggleUserStaus} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const {
  getAllUsers,
  getMyProfile,
  updateMyProfile,
  updateDailyPromiseSubscription,
  updateUserDailyPromiseByAdmin,
  getDailyPromiseActiveUsers,
  activateDailyPromise,
  deactivateDailyPromise,
} = require('../controllers/userController');
const { requireAdmin } = require('../middlewares/adminMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = express.Router();

router.patch('/update-userstatus', protect, toggleUserStaus);
router.get('/getAll-users', protect, getAllUsers);
router.get('/daily-promise-active', protect, requireAdmin, getDailyPromiseActiveUsers);

router.get('/me', protect, getMyProfile);
router.get('/profile', protect, getMyProfile);
router.patch('/profile', protect, upload.single('profilePic'), updateMyProfile);
router.patch('/me', protect, upload.single('profilePic'), updateMyProfile);

router.post('/activate-daily-promise', protect, activateDailyPromise);
router.post('/deactivate-daily-promise', protect, deactivateDailyPromise);
router.patch('/me/daily-promise', protect, updateDailyPromiseSubscription);
router.patch('/daily-promise-subscription', protect, requireAdmin, updateUserDailyPromiseByAdmin);

module.exports = router;
const express = require('express');
const {
    adminLogin,
    userLogin,
    verifyOTP,
    changeAdminPassword,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/adminMiddleware');

const router = express.Router();

router.post('/admin-login', adminLogin);
router.post('/change-admin-password', protect, requireAdmin, changeAdminPassword);
router.post('/user-login', userLogin);
router.post('/verify-otp', verifyOTP);

module.exports = router;
const express = require('express');
const {adminLogin,userLogin,verifyOTP} = require('../controllers/authController');

const router = express.Router();

router.post('/admin-login', adminLogin);
router.post('/user-login', userLogin);
router.post('/verify-otp', verifyOTP);

module.exports = router;
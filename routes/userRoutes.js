const express = require('express');
const {toggleUserStaus} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { getAllUsers } = require('../controllers/userController');

const router = express.Router();

router.patch('/update-userstatus', protect, toggleUserStaus);
router.get('/getAll-users', protect, getAllUsers);

module.exports = router;
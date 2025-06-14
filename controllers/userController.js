const User = require('../models/usermodal');

exports.getAllUsers = async(req,res) => {
    const {page = 1, limit = 10} = req.query;
    try {
        const skip = (page - 1) * limit;
        const total = await User.countDocuments();
        const users = await User.find({}, '-otp -otpExpiry').sort({createdAt : - 1}).skip(skip).limit(Number(limit));
        res.status(200).json({status : "Success", data:users,pagination:({totalItems:total,currentPage:Number(page),totalPages:Math.ceil(total/limit),pageSize:Number(limit)}) })
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
}
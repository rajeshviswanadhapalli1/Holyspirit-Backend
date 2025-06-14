const Admin = require('../models/adminmodal');
const User = require('../models/usermodal');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { compareHash } = require('../utils/hashService');
const {sendOTP} = require('../utils/otpService');
const { verifyOTP: twilioVerify } = require('../utils/otpService');
const crypto = require('crypto');

exports.adminLogin = async (req, res) => {
    const {email,password} = req.body;
    try {
        // const admin = await Admin.findOne({email});
        if(!email || !password){
            return res.status(400).json({message : "All Fields are Required"})
        }
        try {
            const adminEmail = process.env.ADMIN_EMAIL;
            
            if (email !== adminEmail) {
                return res.status(401).json({ message: "Invalid email or unauthorized access." });
            }
            const hashedPassword = process.env.ADMIN_PASSWORD;
            
            const isMatch = await compareHash(password, hashedPassword);
            
            if (!isMatch) {
                return res.status(401).json({ message: "Invalid email or password." });
            }
            
            const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
                expiresIn: "1d",
              });
          
              res.status(200).json({ message: "Admin login successful.",status:'Success', token });
        } catch (error) {
            res.status(500).json({ message: "Error logging in.", error: err.message });
        }
    } catch (error) {
        
    }
}

exports.userLogin = async(req,res) => {
    console.log('mobile login');
    
    const {mobile} = req.body;
    if (!mobile) {
        return res.status(400).json({ message: "Mobile Number is required" });
      }
    try {
        // const otp = generateOtp();
        // const otpExpiry = Date.now() + parseInt(process.env.OTP_EXPIRY_MINUTES || 2) * 60000;
        console.log(mobile,'mobile in login');
        let user = await User.findOne({mobile})
        if (!user) {
            user = new User({ mobile });
            await user.save();
          }
        // await user.save();
        // otpStore.set(mobile, { otp, otpExpiry });
        
        console.log(mobile,'mobile');
        
        await sendOTP(mobile);
        res.json({ message: 'OTP sent successfully',status:'Success' });
    } catch (error) {
        console.log(error.message,'login error');
        
        res.status(500).json({ message: error.message });
    }
}

// exports.verifyOTP = async(req,res) => {
//     const { mobile, otp } = req.body;
//     try {
//         const user = await User.findOne({ mobile});
//         if (!user) {
//             return res.status(400).json({ message: 'User Not Found' });
//         }
//         const isValidOTP = user.verifyOTP(otp);
//         if (!isValidOTP) {
//             return res.status(400).json({ message: 'Invalid or expired OTP' });
//           }
//           await user.save({validateBeforeSave:false});
//           if (!user.username || user.username === mobile) {
//             user.username = `${mobile}@Holyspirit`;
//             await user.save({ validateBeforeSave: false });
//         }
//         const token = jwt.sign({ id: user._id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1d' });
//         res.json({ token:token,message: 'OTP verified successfully', status: 'verified',username: user.username, });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// }
exports.verifyOTP = async (req, res) => {
    const { mobile, code } = req.body;
    try {
      const user = await User.findOne({ mobile });
      if (!user) return res.status(400).json({ message: 'User not found' });
  
      const isVerified = await twilioVerify(mobile, code);
      if (!isVerified) return res.status(400).json({ message: 'Invalid or expired OTP' });
  
      if (!user.username || user.username === mobile) {
        user.username = `${mobile}@Holyspirit`;
        await user.save({ validateBeforeSave: false });
      }
  
      const token = jwt.sign({ id: user._id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '10d' });
      res.json({ token, message: 'OTP verified successfully', status: 'verified', username: user.username });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
exports.toggleUserStaus = async(req,res) => {
    const {userId,status} = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }
        const user = await User.findOneAndUpdate(
            { _id: userId },
            {active : status},
            {new :true}
        )
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        res.json({ message: `User status updated to ${status ? 'active' : 'inactive'}`,status:'Success',user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
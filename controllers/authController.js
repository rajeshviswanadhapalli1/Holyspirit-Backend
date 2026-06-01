const Admin = require('../models/adminmodal');
const User = require('../models/usermodal');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { compareHash } = require('../utils/hashService');

const MIN_ADMIN_PASSWORD_LENGTH = 8;
const { sendOTP, verifyOTP: fixedVerifyOTP } = require('../utils/otpService');
const crypto = require('crypto');

exports.adminLogin = async (req, res) => {
    const {email,password} = req.body;
    try {
        // const admin = await Admin.findOne({email});
        if(!email || !password){
            return res.status(400).json({message : "All Fields are Required"})
        }
        const reqEmail = String(email).trim().toLowerCase();
        const reqPassword = String(password);

        // Prefer DB-based admin if present.
        const dbAdmin = await Admin.findOne({ email: reqEmail });
        if (dbAdmin) {
            if (!process.env.JWT_SECRET) {
                return res.status(500).json({ message: "Server misconfigured: missing JWT secret." });
            }
            const isMatch = await compareHash(reqPassword, dbAdmin.password);
            if (!isMatch) {
                return res.status(401).json({ message: "Invalid admin email or password." });
            }

            const token = jwt.sign({ id: dbAdmin._id, role: "admin" }, process.env.JWT_SECRET, {
                expiresIn: "1d",
            });
            return res.status(200).json({ message: "Admin login successful.", status:'Success', token });
        }

        // Fallback to env-based admin credentials.
        const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
        const hashedPassword = process.env.ADMIN_PASSWORD;
        if (!adminEmail || !hashedPassword || !process.env.JWT_SECRET) {
            return res.status(500).json({ message: "Server misconfigured: missing admin credentials." });
        }
        if (reqEmail !== adminEmail) {
            return res.status(401).json({ message: "Invalid admin email or password." });
        }
        const isMatch = await compareHash(reqPassword, hashedPassword);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid admin email or password." });
        }

        const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });

        res.status(200).json({ message: "Admin login successful.", status:'Success', token });
    } catch (error) {
        res.status(500).json({ message: "Error logging in.", error: error.message });
    }
};

exports.changeAdminPassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            status: 'Error',
            message: 'currentPassword and newPassword are required',
        });
    }

    if (String(newPassword).length < MIN_ADMIN_PASSWORD_LENGTH) {
        return res.status(400).json({
            status: 'Error',
            message: `New password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`,
        });
    }

    if (currentPassword === newPassword) {
        return res.status(400).json({
            status: 'Error',
            message: 'New password must be different from the current password',
        });
    }

    try {
        if (req.user?.id) {
            const admin = await Admin.findById(req.user.id);
            if (!admin) {
                return res.status(404).json({ status: 'Error', message: 'Admin account not found' });
            }

            const isMatch = await compareHash(String(currentPassword), admin.password);
            if (!isMatch) {
                return res.status(401).json({ status: 'Error', message: 'Current password is incorrect' });
            }

            admin.password = String(newPassword);
            await admin.save();

            return res.status(200).json({
                status: 'Success',
                message: 'Admin password updated successfully',
            });
        }

        const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
        const hashedPassword = process.env.ADMIN_PASSWORD;
        if (!adminEmail || !hashedPassword) {
            return res.status(500).json({
                status: 'Error',
                message: 'Server misconfigured: missing admin credentials',
            });
        }

        const isMatch = await compareHash(String(currentPassword), hashedPassword);
        if (!isMatch) {
            return res.status(401).json({ status: 'Error', message: 'Current password is incorrect' });
        }

        return res.status(501).json({
            status: 'Error',
            message:
                'Password is stored in .env for this admin. Run: node scripts/reset-admin-password.js "YourNewPassword" and update ADMIN_PASSWORD, or use scripts/seed-admin.js for a MongoDB admin.',
        });
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

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
  
      const isVerified = await fixedVerifyOTP(mobile, code);
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
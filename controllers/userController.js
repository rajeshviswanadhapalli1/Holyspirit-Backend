const User = require('../models/usermodal');
const mongoose = require('mongoose');
const { uploadImageBuffer } = require('../utils/cloudinaryUpload');
const {
  broadcastDailyPromise,
  todayIsoDate,
} = require('../services/dailyPromiseBroadcastService');

function formatUserProfile(user) {
  const obj = user.toObject ? user.toObject() : user;
  return {
    _id: obj._id,
    mobile: obj.mobile,
    username: obj.username || '',
    profilePic: obj.profilePic || '',
    verified: Boolean(obj.verified),
    active: Boolean(obj.active),
    dailyPromise: Boolean(obj.dailyPromise),
    languagePreference: obj.languagePreference || 'telugu',
    dailyPromiseStatus: obj.dailyPromise ? 'Active' : 'Inactive',
    dailyPromiseActive: Boolean(obj.dailyPromise),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

exports.getAllUsers = async(req,res) => {
    const {page = 1, limit = 10} = req.query;
    try {
        const skip = (page - 1) * limit;
        const total = await User.countDocuments();
        const users = await User.find({}, '-otp -otpExpiry').sort({createdAt : - 1}).skip(skip).limit(Number(limit));
        const data = users.map((u) => {
          const obj = u.toObject ? u.toObject() : u;
          return {
            ...obj,
            // Backwards-compatible fields for dashboards
            dailyPromiseStatus: obj.dailyPromise ? 'Active' : 'Inactive',
            dailyPromiseActive: Boolean(obj.dailyPromise),
          };
        });
        res.status(200).json({status : "Success", data,pagination:({totalItems:total,currentPage:Number(page),totalPages:Math.ceil(total/limit),pageSize:Number(limit)}) })
    } catch (error) {
        console.log(error.message, "error :::::");
        
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: 'Error', message: 'User not found' });
    }
    res.status(200).json({ status: 'Success', data: formatUserProfile(user) });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
};

/** Update logged-in user profile (username, language, profile picture) */
exports.updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: 'Error', message: 'User not found' });
    }

    if (req.body.username !== undefined) {
      const username = String(req.body.username).trim();
      if (!username) {
        return res.status(400).json({ status: 'Error', message: 'username cannot be empty' });
      }
      user.username = username;
    }

    if (req.body.languagePreference !== undefined) {
      const lang = normalizeLanguage(req.body.languagePreference);
      if (!lang) {
        return res.status(400).json({
          status: 'Error',
          message: 'languagePreference must be "telugu" or "english"',
        });
      }
      user.languagePreference = lang;
    }

    if (req.file && req.file.buffer) {
      const upload = await uploadImageBuffer(req.file.buffer, 'user-profiles');
      user.profilePic = upload.secure_url;
    } else if (req.body.removeProfilePic === 'true' || req.body.removeProfilePic === true) {
      user.profilePic = '';
    }

    await user.save();

    res.status(200).json({
      status: 'Success',
      message: 'Profile updated successfully',
      data: formatUserProfile(user),
    });
  } catch (error) {
    console.error('updateMyProfile:', error);
    res.status(500).json({ status: 'Error', message: error.message });
  }
};

function normalizeLanguage(lang) {
  const v = String(lang || '').toLowerCase();
  if (v === 'english' || v === 'en' || v === 'eng') return 'english';
  if (v === 'telugu' || v === 'te' || v === 'tel') return 'telugu';
  return null;
}

/** User turns ON daily promise — one WhatsApp card per day at 12 AM (selected language only) */
exports.activateDailyPromise = async (req, res) => {
  try {
    const language = normalizeLanguage(
      req.body.languagePreference || req.body.language
    );

    if (!language) {
      return res.status(400).json({
        status: 'Error',
        message: 'languagePreference is required: "telugu" or "english"',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: 'Error', message: 'User not found' });
    }

    if (!user.active) {
      return res.status(403).json({
        status: 'Error',
        message: 'Your account is inactive. Contact admin to activate your account first.',
      });
    }

    user.dailyPromise = true;
    user.languagePreference = language;
    await user.save();

    const timezone = process.env.BHASHSMS_TIMEZONE || 'Asia/Kolkata';
    const today = todayIsoDate(timezone);
    setImmediate(() => {
      broadcastDailyPromise({ date: today, userId: user._id })
        .then((r) =>
          console.log(`[DailyPromise] Same-day card after activate (${today}):`, JSON.stringify(r))
        )
        .catch((err) =>
          console.error('[DailyPromise] Same-day card after activate failed:', err.message)
        );
    });

    res.status(200).json({
      status: 'Success',
      message:
        'Daily promise activated. You will receive one promise card on WhatsApp every day at 12:00 AM (India time) in your selected language. If today\'s card is already uploaded, it will be sent shortly.',
      data: {
        dailyPromise: true,
        languagePreference: user.languagePreference,
        schedule: '12:00 AM Asia/Kolkata',
        cardsPerDay: 1,
        cardLanguage: language,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
};

/** User turns OFF daily promise WhatsApp */
exports.deactivateDailyPromise = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { dailyPromise: false },
      { new: true }
    ).select('-__v');

    if (!user) {
      return res.status(404).json({ status: 'Error', message: 'User not found' });
    }

    res.status(200).json({
      status: 'Success',
      message: 'Daily promise deactivated. You will no longer receive WhatsApp cards.',
      data: {
        dailyPromise: false,
        languagePreference: user.languagePreference,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
};

exports.updateDailyPromiseSubscription = async (req, res) => {
  try {
    const { enabled, languagePreference } = req.body;

    if (enabled === undefined && languagePreference === undefined) {
      return res.status(400).json({
        status: 'Error',
        message: 'Provide enabled (boolean) and/or languagePreference (english|telugu)',
      });
    }

    const update = {};
    if (enabled !== undefined) update.dailyPromise = Boolean(enabled);
    if (languagePreference !== undefined) {
      const lang = normalizeLanguage(languagePreference);
      if (!lang) {
        return res.status(400).json({
          status: 'Error',
          message: 'languagePreference must be english or telugu',
        });
      }
      update.languagePreference = lang;
    }

    if (update.dailyPromise === true && !update.languagePreference) {
      const current = await User.findById(req.user.id).select('languagePreference');
      if (!current?.languagePreference) {
        return res.status(400).json({
          status: 'Error',
          message: 'languagePreference is required when enabling daily promise',
        });
      }
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select(
      '-__v'
    );
    if (!user) {
      return res.status(404).json({ status: 'Error', message: 'User not found' });
    }

    res.status(200).json({
      status: 'Success',
      message: user.dailyPromise
        ? 'Daily promise WhatsApp enabled'
        : 'Daily promise WhatsApp disabled',
      data: {
        dailyPromise: user.dailyPromise,
        languagePreference: user.languagePreference,
        active: user.active,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
};

/** Users subscribed to daily promise WhatsApp (active account + dailyPromise: true) */
exports.getDailyPromiseActiveUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, countOnly } = req.query;
    const filter = { active: true, dailyPromise: true };

    const total = await User.countDocuments(filter);

    if (String(countOnly).toLowerCase() === 'true') {
      return res.status(200).json({
        status: 'Success',
        data: { totalActiveDailyPromiseUsers: total },
      });
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const users = await User.find(filter)
      .select('_id mobile username active dailyPromise languagePreference createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      status: 'Success',
      data: users.map((u) => ({
        ...(u.toObject ? u.toObject() : u),
        dailyPromiseStatus: 'Active',
        dailyPromiseActive: true,
      })),
      pagination: {
        totalItems: total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)) || 1,
        pageSize: Number(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
};

exports.updateUserDailyPromiseByAdmin = async (req, res) => {
  try {
    const { userId, enabled, languagePreference } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ status: 'Error', message: 'Invalid user ID' });
    }

    const update = {};
    if (enabled !== undefined) update.dailyPromise = Boolean(enabled);
    if (languagePreference !== undefined) {
      const lang = normalizeLanguage(languagePreference);
      if (!lang) {
        return res.status(400).json({ status: 'Error', message: 'languagePreference must be english or telugu' });
      }
      update.languagePreference = lang;
    }
    if (update.dailyPromise === true && !update.languagePreference) {
      return res.status(400).json({
        status: 'Error',
        message: 'languagePreference is required when enabling daily promise',
      });
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) {
      return res.status(404).json({ status: 'Error', message: 'User not found' });
    }

    res.status(200).json({
      status: 'Success',
      data: {
        ...(user.toObject ? user.toObject() : user),
        dailyPromiseStatus: user.dailyPromise ? 'Active' : 'Inactive',
        dailyPromiseActive: Boolean(user.dailyPromise),
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
};
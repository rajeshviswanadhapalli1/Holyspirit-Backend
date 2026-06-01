const User = require('../models/usermodal');
const DailyPromise = require('../models/dailypromisemodal');
const DailyPromiseBroadcastLog = require('../models/dailyPromiseBroadcastLog');
const { sendWhatsAppDailyPromise } = require('../utils/bhashSmsService');
const { normalizeIndianMobile } = require('../utils/phoneUtils');

function todayIsoDate(timezone = 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatDisplayDate(isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function truncate(text, max = 120) {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 3)}...`;
}

function pickLanguage(user) {
  const pref = String(user.languagePreference || process.env.BHASHSMS_DEFAULT_LANGUAGE || 'telugu')
    .toLowerCase();
  if (pref === 'english' || pref === 'en') return 'english';
  return 'telugu';
}

function buildTemplateParams(promise, language) {
  const isEn = language === 'english';
  const dateLabel = formatDisplayDate(promise.date);
  const reference = isEn ? promise.englishReference : promise.teluguReference || promise.englishReference;
  const text = truncate(isEn ? promise.text : promise.telugu || promise.text);

  return [dateLabel, reference || '', text];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Users who receive 12 AM WhatsApp: account active + opted in to daily promise + valid mobile */
function dailyPromiseSubscriberFilter() {
  return {
    active: true,
    dailyPromise: true,
    mobile: { $exists: true, $ne: '' },
  };
}

async function getDailyPromiseSubscribers(select = '_id mobile languagePreference') {
  return User.find(dailyPromiseSubscriberFilter()).select(select);
}

/**
 * How many subscribers still need today's WhatsApp (promise exists, no sent log).
 */
async function getBroadcastPendingStatus(broadcastDate) {
  const promise = await DailyPromise.findOne({ date: broadcastDate });
  if (!promise) {
    return {
      broadcastDate,
      promiseExists: false,
      subscriberCount: 0,
      sentCount: 0,
      pendingCount: 0,
    };
  }

  const users = await getDailyPromiseSubscribers('_id');

  const userIds = users.map((u) => u._id);
  const sentCount = await DailyPromiseBroadcastLog.countDocuments({
    broadcastDate,
    userId: { $in: userIds },
    status: 'sent',
  });

  return {
    broadcastDate,
    promiseExists: true,
    subscriberCount: users.length,
    sentCount,
    pendingCount: Math.max(0, users.length - sentCount),
  };
}

/**
 * Send today's daily promise to all active subscribed users.
 */
async function broadcastDailyPromise(options = {}) {
  const timezone = options.timezone || process.env.BHASHSMS_TIMEZONE || 'Asia/Kolkata';
  const broadcastDate = options.date || todayIsoDate(timezone);
  const dryRun = Boolean(options.dryRun);
  const delayMs = Number(process.env.BHASHSMS_SEND_DELAY_MS || 400);

  const promise = await DailyPromise.findOne({ date: broadcastDate });
  if (!promise) {
    return {
      ok: false,
      broadcastDate,
      message: `No daily promise in database for ${broadcastDate}`,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  let users = await getDailyPromiseSubscribers('_id mobile languagePreference');

  if (options.userId) {
    users = users.filter((u) => String(u._id) === String(options.userId));
    if (users.length === 0) {
      return {
        ok: false,
        broadcastDate,
        message: 'User is not an active daily-promise subscriber',
        sent: 0,
        failed: 0,
        skipped: 0,
      };
    }
  }

  console.log(
    `[DailyPromise] ${broadcastDate}: ${users.length} subscriber(s) (active=true, dailyPromise=true)`
  );

  const results = { sent: 0, failed: 0, skipped: 0, errors: [] };

  for (const user of users) {
    const existing = await DailyPromiseBroadcastLog.findOne({
      broadcastDate,
      userId: user._id,
      status: 'sent',
    });
    if (existing) {
      results.skipped += 1;
      continue;
    }

    const language = pickLanguage(user);
    const imageUrl = language === 'english' ? promise.imageUrlEnglish : promise.imageUrlTelugu;
    const params = buildTemplateParams(promise, language);

    if (!imageUrl) {
      results.failed += 1;
      results.errors.push({ mobile: user.mobile, error: `Missing ${language} image URL` });
      continue;
    }

    const phoneForApi = normalizeIndianMobile(user.mobile);
    if (!phoneForApi) {
      results.failed += 1;
      results.errors.push({
        mobile: user.mobile,
        phoneSentToBhashSms: null,
        error: `Invalid mobile for BhashSMS (use 10 digits, no +91): ${user.mobile}`,
      });
      continue;
    }

    if (dryRun) {
      results.sent += 1;
      continue;
    }

    try {
      const provider = await sendWhatsAppDailyPromise({
        phone: phoneForApi,
        params,
        imageUrl,
      });

      await DailyPromiseBroadcastLog.findOneAndUpdate(
        { broadcastDate, userId: user._id },
        {
          broadcastDate,
          userId: user._id,
          mobile: phoneForApi,
          language,
          promiseDate: promise.date,
          imageUrl,
          status: 'sent',
          providerResponse: String(provider.response || ''),
          error: '',
        },
        { upsert: true, new: true }
      );

      results.sent += 1;
    } catch (err) {
      const providerMsg = err.providerResponse || err.response || '';
      const phoneSent = err.phoneSentToBhashSms || phoneForApi;
      await DailyPromiseBroadcastLog.findOneAndUpdate(
        { broadcastDate, userId: user._id },
        {
          broadcastDate,
          userId: user._id,
          mobile: phoneSent,
          language,
          status: 'failed',
          error: err.message,
          providerResponse: String(providerMsg),
        },
        { upsert: true, new: true }
      );
      results.failed += 1;
      results.errors.push({
        mobile: user.mobile,
        phoneSentToBhashSms: phoneSent,
        error: err.message,
      });
    }

    if (delayMs > 0) await delay(delayMs);
  }

  return {
    ok: true,
    broadcastDate,
    promiseDate: promise.date,
    totalSubscribers: users.length,
    dryRun,
    ...results,
  };
}

/**
 * Admin report: daily delivery counts + per activated user delivered or not.
 */
async function getDailyDeliveryReport(broadcastDate) {
  const promise = await DailyPromise.findOne({ date: broadcastDate }).select('date');
  const subscribers = await getDailyPromiseSubscribers(
    '_id mobile username active dailyPromise languagePreference'
  );

  const logs = await DailyPromiseBroadcastLog.find({ broadcastDate });
  const logByUserId = new Map(logs.map((l) => [String(l.userId), l]));

  let delivered = 0;
  let failed = 0;
  let pending = 0;

  const users = subscribers.map((user) => {
    const log = logByUserId.get(String(user._id));
    let deliveryStatus = 'pending';
    let deliveredFlag = false;

    if (log?.status === 'sent') {
      deliveryStatus = 'delivered';
      deliveredFlag = true;
      delivered += 1;
    } else if (log?.status === 'failed') {
      deliveryStatus = 'failed';
      failed += 1;
    } else {
      pending += 1;
    }

    return {
      userId: user._id,
      mobile: user.mobile,
      username: user.username || '',
      accountActive: Boolean(user.active),
      dailyPromiseActive: Boolean(user.dailyPromise),
      languagePreference: user.languagePreference || 'telugu',
      deliveryStatus,
      delivered: deliveredFlag,
      error: log?.error || '',
      providerResponse: log?.providerResponse || '',
      promiseDate: log?.promiseDate || broadcastDate,
      imageUrl: log?.imageUrl || '',
      attemptedAt: log?.updatedAt || log?.createdAt || null,
    };
  });

  return {
    broadcastDate,
    promiseExists: Boolean(promise),
    promiseDate: promise?.date || broadcastDate,
    summary: {
      activatedUsers: subscribers.length,
      delivered,
      failed,
      pending,
      notAttempted: pending,
      deliveryRatePercent:
        subscribers.length > 0
          ? Math.round((delivered / subscribers.length) * 100)
          : 0,
    },
    users,
  };
}

/**
 * Fire-and-forget helper after upload / cron — logs result, never throws to caller.
 */
function triggerBroadcastForDate(date, label = 'auto') {
  return broadcastDailyPromise({ date })
    .then((result) => {
      console.log(`[DailyPromise ${label}] ${date}:`, JSON.stringify(result));
      return result;
    })
    .catch((err) => {
      console.error(`[DailyPromise ${label}] ${date} failed:`, err.message);
      throw err;
    });
}

module.exports = {
  broadcastDailyPromise,
  triggerBroadcastForDate,
  getBroadcastPendingStatus,
  getDailyDeliveryReport,
  getDailyPromiseSubscribers,
  dailyPromiseSubscriberFilter,
  todayIsoDate,
  formatDisplayDate,
};

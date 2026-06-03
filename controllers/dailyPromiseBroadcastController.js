const {
  broadcastDailyPromise,
  todayIsoDate,
  getDailyDeliveryReport,
} = require('../services/dailyPromiseBroadcastService');
const { runDailyPromiseBroadcastJobSafe } = require('../jobs/dailyPromiseCron');
const DailyPromiseBroadcastLog = require('../models/dailyPromiseBroadcastLog');

exports.sendDailyPromiseNow = async (req, res) => {
  try {
    const { date, dryRun } = req.body || {};
    const result = await broadcastDailyPromise({
      date: date || undefined,
      dryRun: Boolean(dryRun),
    });
    res.status(200).json({ status: 'Success', data: result });
  } catch (err) {
    console.error('sendDailyPromiseNow:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
};

exports.getBroadcastStatus = async (req, res) => {
  try {
    const timezone = process.env.BHASHSMS_TIMEZONE || 'Asia/Kolkata';
    const broadcastDate = req.query.date || todayIsoDate(timezone);

    const logs = await DailyPromiseBroadcastLog.find({ broadcastDate });
    const sent = logs.filter((l) => l.status === 'sent').length;
    const failed = logs.filter((l) => l.status === 'failed').length;

    res.status(200).json({
      status: 'Success',
      data: {
        broadcastDate,
        sent,
        failed,
        total: logs.length,
        recentFailures: logs
          .filter((l) => l.status === 'failed')
          .slice(-20)
          .map((l) => ({
            mobile: l.mobile,
            error: l.error,
            providerResponse: l.providerResponse || '',
          })),
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'Error', message: err.message });
  }
};

/** Admin: daily WhatsApp delivery stats + per-user delivered / failed / pending */
exports.getDailyDeliveryReport = async (req, res) => {
  try {
    const timezone = process.env.BHASHSMS_TIMEZONE || 'Asia/Kolkata';
    const broadcastDate = req.query.date || todayIsoDate(timezone);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(broadcastDate)) {
      return res.status(400).json({
        status: 'Error',
        message: 'Invalid date. Use YYYY-MM-DD',
      });
    }

    const data = await getDailyDeliveryReport(broadcastDate);
    res.status(200).json({ status: 'Success', data });
  } catch (err) {
    console.error('getDailyDeliveryReport:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
};

/**
 * External cron trigger (Render Cron Job, cron-job.org, etc.).
 * Secured with CRON_SECRET — does not need admin JWT.
 */
exports.triggerDailyPromiseCron = async (req, res) => {
  try {
    const date = req.body?.date || req.query?.date;
    const result = await runDailyPromiseBroadcastJobSafe({
      date: date || undefined,
      source: 'external-cron',
    });
    res.status(200).json({ status: 'Success', data: result });
  } catch (err) {
    console.error('triggerDailyPromiseCron:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
};

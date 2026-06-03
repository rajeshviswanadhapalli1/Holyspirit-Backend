const cron = require('node-cron');
const {
  broadcastDailyPromise,
  todayIsoDate,
  getBroadcastPendingStatus,
} = require('../services/dailyPromiseBroadcastService');

let started = false;
let catchUpRunning = false;
let broadcastJobRunning = false;

/**
 * Core job: send today's daily promise WhatsApp to all active subscribers.
 * Used by in-app cron, startup catch-up, admin API, and Render external cron.
 */
async function runDailyPromiseBroadcastJob(options = {}) {
  const timezone = options.timezone || process.env.BHASHSMS_TIMEZONE || 'Asia/Kolkata';
  const broadcastDate = options.date || todayIsoDate(timezone);
  const source = options.source || 'unknown';

  console.log(`[DailyPromise Job] Start (${source}) for ${broadcastDate} (${timezone})`);

  const pending = await getBroadcastPendingStatus(broadcastDate);
  if (!pending.promiseExists) {
    const result = {
      ok: false,
      broadcastDate,
      source,
      message: `No daily promise in database for ${broadcastDate}`,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
    console.error(`[DailyPromise Job] ${result.message}`);
    return result;
  }

  if (pending.pendingCount === 0) {
    const result = {
      ok: true,
      broadcastDate,
      source,
      message: `All ${pending.sentCount} subscriber(s) already delivered for ${broadcastDate}`,
      totalSubscribers: pending.subscriberCount,
      sent: 0,
      failed: 0,
      skipped: pending.sentCount,
    };
    console.log(`[DailyPromise Job] ${result.message}`);
    return result;
  }

  console.log(
    `[DailyPromise Job] ${pending.pendingCount}/${pending.subscriberCount} pending for ${broadcastDate}`
  );
  const result = await broadcastDailyPromise({ timezone, date: broadcastDate });
  console.log(`[DailyPromise Job] Done (${source}):`, JSON.stringify(result));
  return { ...result, source };
}

async function runDailyPromiseBroadcastJobSafe(options = {}) {
  if (broadcastJobRunning) {
    return {
      ok: false,
      message: 'Daily promise broadcast already in progress',
      skipped: true,
    };
  }
  broadcastJobRunning = true;
  try {
    return await runDailyPromiseBroadcastJob(options);
  } finally {
    broadcastJobRunning = false;
  }
}

async function runDailyPromiseCatchUp() {
  if (process.env.ENABLE_DAILY_PROMISE_CRON === 'false') return;
  if (catchUpRunning) return;
  catchUpRunning = true;

  const timezone = process.env.BHASHSMS_TIMEZONE || 'Asia/Kolkata';
  const broadcastDate = todayIsoDate(timezone);

  try {
    const pending = await getBroadcastPendingStatus(broadcastDate);
    if (!pending.promiseExists) {
      console.log(`[DailyPromise CatchUp] No promise row for ${broadcastDate}`);
      return;
    }
    if (pending.pendingCount === 0) {
      console.log(`[DailyPromise CatchUp] All ${pending.sentCount} subscribers already sent for ${broadcastDate}`);
      return;
    }

    console.log(
      `[DailyPromise CatchUp] ${pending.pendingCount}/${pending.subscriberCount} pending for ${broadcastDate} — sending now`
    );
    const result = await runDailyPromiseBroadcastJobSafe({
      timezone,
      date: broadcastDate,
      source: 'catch-up',
    });
    console.log('[DailyPromise CatchUp] Done:', JSON.stringify(result));
  } catch (err) {
    console.error('[DailyPromise CatchUp] Failed:', err.message);
  } finally {
    catchUpRunning = false;
  }
}

function startDailyPromiseCron() {
  if (started) return;
  if (process.env.ENABLE_DAILY_PROMISE_CRON === 'false') {
    console.log('[DailyPromise Cron] Disabled (ENABLE_DAILY_PROMISE_CRON=false)');
    return;
  }

  const timezone = process.env.BHASHSMS_TIMEZONE || 'Asia/Kolkata';
  const schedule = process.env.DAILY_PROMISE_CRON || '0 0 * * *';

  if (!cron.validate(schedule)) {
    console.error(`[DailyPromise Cron] Invalid cron expression: ${schedule}`);
    return;
  }

  cron.schedule(
    schedule,
    async () => {
      try {
        await runDailyPromiseBroadcastJobSafe({ timezone, source: 'in-app-cron' });
      } catch (err) {
        console.error('[DailyPromise Cron] Failed:', err.message);
      }
    },
    { timezone }
  );

  started = true;
  console.log(
    `[DailyPromise Cron] Every day 12:00 AM ${timezone} — WhatsApp to active daily-promise users ("${schedule}")`
  );

  const catchUpDelayMs = Number(process.env.DAILY_PROMISE_CATCHUP_DELAY_MS || 5000);
  setTimeout(() => {
    runDailyPromiseCatchUp().catch((err) => {
      console.error('[DailyPromise CatchUp] Unhandled:', err.message);
    });
  }, catchUpDelayMs);
}

module.exports = {
  startDailyPromiseCron,
  runDailyPromiseCatchUp,
  runDailyPromiseBroadcastJob,
  runDailyPromiseBroadcastJobSafe,
};

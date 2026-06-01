const cron = require('node-cron');
const {
  broadcastDailyPromise,
  todayIsoDate,
  getBroadcastPendingStatus,
} = require('../services/dailyPromiseBroadcastService');

let started = false;
let catchUpRunning = false;

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
    const result = await broadcastDailyPromise({ timezone, date: broadcastDate });
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
      const broadcastDate = todayIsoDate(timezone);
      console.log(
        `[DailyPromise Cron] 12 AM broadcast starting for ${broadcastDate} (${timezone})`
      );
      try {
        const pending = await getBroadcastPendingStatus(broadcastDate);
        if (!pending.promiseExists) {
          console.error(
            `[DailyPromise Cron] No promise in DB for ${broadcastDate} — upload today's card first`
          );
          return;
        }
        console.log(
          `[DailyPromise Cron] Targets: ${pending.subscriberCount} daily-promise active user(s)`
        );
        const result = await broadcastDailyPromise({ timezone, date: broadcastDate });
        console.log('[DailyPromise Cron] Done:', JSON.stringify(result));
      } catch (err) {
        console.error('[DailyPromise Cron] Failed:', err.message);
      }
    },
    { timezone }
  );

  const pendingSchedule = process.env.DAILY_PROMISE_PENDING_CRON || '*/15 * * * *';
  if (cron.validate(pendingSchedule)) {
    cron.schedule(
      pendingSchedule,
      () => {
        runDailyPromiseCatchUp().catch((err) => {
          console.error('[DailyPromise PendingCheck] Unhandled:', err.message);
        });
      },
      { timezone }
    );
    console.log(
      `[DailyPromise Cron] Pending delivery check every 15 min (${pendingSchedule}, ${timezone})`
    );
  }

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

module.exports = { startDailyPromiseCron, runDailyPromiseCatchUp };

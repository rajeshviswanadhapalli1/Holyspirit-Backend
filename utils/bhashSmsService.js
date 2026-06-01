const axios = require('axios');
const { normalizeIndianMobile } = require('./phoneUtils');

/** Activated WhatsApp API (image template) — use sendmsgutil.php, not sendmsg.php */
const API_URL =
  process.env.BHASHSMS_API_URL || 'http://bhashsms.com/api/sendmsgutil.php';

const FAILURE_PATTERNS = [
  'not activated',
  'api not',
  'invalid',
  'error',
  'fail',
  'insufficient',
  'wrong password',
  'incorrect password',
  'unauthorized',
  'denied',
  'rejected',
  'no credit',
  'low balance',
  'not approved',
  'sender id',
  'blocked',
];

/**
 * BhashSMS sendmsgutil.php returns e.g. "S.641" on success, or an error string.
 */
function parseBhashSmsResponse(body) {
  const bodyStr = typeof body === 'string' ? body.trim() : JSON.stringify(body ?? '').trim();
  if (!bodyStr) {
    return { ok: false, message: 'Empty BhashSMS response' };
  }

  const lower = bodyStr.toLowerCase();
  for (const pattern of FAILURE_PATTERNS) {
    if (lower.includes(pattern)) {
      return { ok: false, message: bodyStr };
    }
  }

  // sendmsgutil success: S.641
  if (/^s\.\d+/i.test(bodyStr)) {
    return { ok: true, messageId: bodyStr, message: bodyStr };
  }

  if (/^\d+$/.test(bodyStr)) {
    return { ok: true, messageId: bodyStr, message: bodyStr };
  }

  if (/\b(sent|success|submitted|queued|accepted)\b/i.test(bodyStr)) {
    return { ok: true, message: bodyStr };
  }

  return { ok: false, message: bodyStr };
}

function getConfig() {
  const user = process.env.BHASHSMS_USER;
  const pass = process.env.BHASHSMS_PASS;
  const template = process.env.BHASHSMS_TEMPLATE_NAME || process.env.BHASHSMS_TEMPLATE;

  if (!user || !pass) {
    throw new Error('BhashSMS is not configured. Set BHASHSMS_USER and BHASHSMS_PASS in .env');
  }
  if (!template) {
    throw new Error('BhashSMS template missing. Set BHASHSMS_TEMPLATE_NAME in .env');
  }

  return {
    user,
    pass,
    sender: process.env.BHASHSMS_SENDER || 'BUZWAP',
    template,
    priority: process.env.BHASHSMS_PRIORITY || 'wa',
    stype: process.env.BHASHSMS_STYPE || 'normal',
  };
}

function shouldSendTemplateParams(params) {
  if (process.env.BHASHSMS_SEND_PARAMS === 'false') return false;
  const paramString = (params || []).map((p) => String(p ?? '').trim()).join(',');
  return Boolean(paramString);
}

/**
 * Send WhatsApp template message with image (BhashSMS sendmsgutil.php).
 *
 * @param {object} opts
 * @param {string} opts.phone - User mobile (10 digits or +91…)
 * @param {string[]} [opts.params] - Optional template variables (only if template uses Params)
 * @param {string} opts.imageUrl - Promise card image URL (Cloudinary)
 */
async function sendWhatsAppDailyPromise({ phone, params, imageUrl }) {
  const cfg = getConfig();
  const normalizedPhone = normalizeIndianMobile(phone);
  if (!normalizedPhone) {
    throw new Error(`Invalid mobile number (BhashSMS needs 10 digits without +91): ${phone}`);
  }
  if (!imageUrl) {
    throw new Error('imageUrl is required for WhatsApp image template');
  }

  if (process.env.BHASHSMS_DEBUG === 'true') {
    console.log(
      `[BhashSMS] ${API_URL} phone=${normalizedPhone} template=${cfg.template} (input: ${phone})`
    );
  }

  const query = {
    user: cfg.user,
    pass: cfg.pass,
    sender: cfg.sender,
    phone: normalizedPhone,
    text: cfg.template,
    priority: cfg.priority,
    stype: cfg.stype,
    htype: 'image',
    url: imageUrl,
  };

  if (shouldSendTemplateParams(params)) {
    query.Params = params.map((p) => String(p ?? '').trim()).join(',');
  }

  const response = await axios.get(API_URL, {
    params: query,
    timeout: Number(process.env.BHASHSMS_TIMEOUT_MS || 30000),
    validateStatus: () => true,
  });

  const body = response.data;
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

  if (response.status >= 400) {
    throw new Error(`BhashSMS HTTP ${response.status}: ${bodyStr}`);
  }

  const parsed = parseBhashSmsResponse(body);
  if (!parsed.ok) {
    const err = new Error(`BhashSMS error: ${parsed.message}`);
    err.providerResponse = bodyStr;
    err.phoneSentToBhashSms = normalizedPhone;
    throw err;
  }

  return { phone: normalizedPhone, response: body, messageId: parsed.messageId };
}

module.exports = {
  sendWhatsAppDailyPromise,
  getConfig,
  normalizeIndianMobile,
  parseBhashSmsResponse,
};

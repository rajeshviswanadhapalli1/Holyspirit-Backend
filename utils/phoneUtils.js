/**
 * Normalize Indian mobile for BhashSMS: 10 digits only, no country code (+91 / 91).
 * @see BhashSMS docs — "Mobile Number without 91"
 */
function normalizeIndianMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (!digits) return null;

  let local = digits;
  if (local.length === 12 && local.startsWith('91')) {
    local = local.slice(2);
  } else if (local.length === 13 && local.startsWith('091')) {
    local = local.slice(3);
  } else if (local.length === 11 && local.startsWith('0')) {
    local = local.slice(1);
  }

  if (local.length === 10 && /^[6-9]\d{9}$/.test(local)) {
    return local;
  }

  return null;
}

module.exports = { normalizeIndianMobile };

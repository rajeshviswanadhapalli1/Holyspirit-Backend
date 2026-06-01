const FIXED_OTP_CODE = '123456';

// Twilio removed: sending OTP is a no-op.
const sendOTP = async (mobile) => {
  return { to: String(mobile), status: 'skipped' };
};

// Twilio removed: verification succeeds only for the fixed code.
const verifyOTP = async (_mobile, code) => {
  return String(code) === FIXED_OTP_CODE;
};

module.exports = { sendOTP, verifyOTP, FIXED_OTP_CODE };
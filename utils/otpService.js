const twilio = require('twilio');
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const sendOTP = async (mobile) => {
  const formattedNumber = `${mobile}`; // or adapt based on country
  console.log(formattedNumber,'formattedNumber');
  
  try {
    const verification = await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications
      .create({ to: formattedNumber, channel: 'sms' });

    console.log('OTP sent:', verification.status);
    return verification;
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    throw new Error('Failed to send OTP');
  }
};
const verifyOTP = async (mobile, code) => {
  const formattedNumber = `${mobile}`;
  try {
    const verificationCheck = await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks
      .create({ to: formattedNumber, code });

    console.log('OTP verification result:', verificationCheck.status);
    return verificationCheck.status === 'approved';
  } catch (error) {
    console.error('Error verifying OTP:', error.message);
    throw new Error('Failed to verify OTP');
  }
};
module.exports = { sendOTP,verifyOTP };
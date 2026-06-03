/** Protect cron trigger routes (Render Cron Job, external scheduler). */
function verifyCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({
      status: 'Error',
      message: 'CRON_SECRET is not set on the server. Add it in Render Environment.',
    });
  }

  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const provided =
    req.headers['x-cron-secret'] ||
    bearer ||
    req.query.secret ||
    '';

  if (provided !== secret) {
    return res.status(401).json({ status: 'Error', message: 'Invalid cron secret' });
  }

  next();
}

module.exports = { verifyCronSecret };

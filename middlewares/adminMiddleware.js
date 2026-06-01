const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ status: 'Error', message: 'Admin access required' });
  }
  next();
};

module.exports = { requireAdmin };

const jwt = require('jsonwebtoken');


const protect = (req, res, next) => {
    console.log(req.headers.authorization,'req.headers.authorization');
    const tokenHeader = req.headers.authorization;
    if (!tokenHeader) {
        return res.status(401).json({ status: 'Error', message: 'Authorization header is missing' });
    }
    const tokenParts = tokenHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).json({ status: 'Error', message: 'Invalid Authorization header format' });
    }

    const token = tokenParts[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(decoded,'decoded');
        req.user = decoded;
        next();
    } catch (error) {
        console.error('JWT Verification Error:', error);
        res.status(401).json({ status: 'Error', message: 'Invalid token' });
    }
    
  };
  
  module.exports = { protect };
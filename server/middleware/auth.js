const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }

    if (!token) {
      return res.status(401).json({ message: 'No authentication token, authorization denied.' });
    }

    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-enterprise-grade-hash';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User matching token was not found.' });
    }

    // Check if subscription has expired
    if (user.isPro && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) < new Date()) {
      user.isPro = false;
      await user.save();
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.', error: error.message });
  }
};

module.exports = authMiddleware;

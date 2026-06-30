import jwt from 'jsonwebtoken';
import User from '../models/user.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ 
                    success: false,
                    message: 'User not found' 
                });
            }

            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired'
                });
            }

            console.error('JWT VERIFY ERROR:', error.message);
            return res.status(401).json({ 
                success: false,
                message: 'Not authorized, token failed' 
            });
        }
    }

    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: 'Not authorized, no token' 
        });
    }
};


// authorize('admin', 'manager')
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Role '${req.user.role}' is not authorized to access this route`
            });
        }

        next();
    };
};
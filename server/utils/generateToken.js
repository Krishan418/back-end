import jwt from 'jsonwebtoken';

// Generate Access Token (15 min validity)
export const generateAccessToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET,
        { expiresIn: '50m' } // 50 minutes validity
    );
};

// Generate Refresh Token (7 days validity)
export const generateRefreshToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

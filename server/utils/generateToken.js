import jwt from 'jsonwebtoken';

// This function generates an Access Token
// We set it to 15 minutes as requested
export const generateAccessToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' } // 15 minutes validity
    );
};

// This function generates a Refresh Token
// We set it to 7 days as requested
export const generateRefreshToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET, 
        { expiresIn: '7d' } // 7 days validity
    );
};
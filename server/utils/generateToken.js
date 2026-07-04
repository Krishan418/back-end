import jwt from 'jsonwebtoken';

const isStaffRole = (role) => {
    if (!role) return false;
    const staffRoles = ['admin', 'reception', 'receptionist', 'cashier', 'staff'];
    return staffRoles.includes(role.toLowerCase().trim());
};

// Generate Access Token
export const generateAccessToken = (userId, role) => {
    const isStaff = isStaffRole(role);
    const expiresIn = isStaff ? '15m' : '1h'; // 15 minutes for staff, 1 hour for customers
    
    return jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET,
        { expiresIn }
    );
};

// Generate Refresh Token
export const generateRefreshToken = (userId, role) => {
    const isStaff = isStaffRole(role);
    const expiresIn = isStaff ? '12h' : '30d'; // 12 hours (shift limit) for staff, 30 days for customers
    
    return jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET,
        { expiresIn }
    );
};

import express from "express";
import User from "../../models/user.js";
import { generateToken } from "../../utils/generateToken.js";
import { protect, authorize } from "../authMiddleware.js";

const router = express.Router();

// Register new user (always 'customer' — no self-assign role)
router.post("/register", async (req, res) => {
    const { name, email, password, confirmPassword, phone } = req.body;
    try {
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ message: "Please fill in all required fields" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const newUser = await User.create({ name, email, password, confirmPassword, phone });
        const token = generateToken(newUser._id, newUser.role);

        res.status(201).json({
            success: true,
            data: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role,
                token
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Login user
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: "Please provide email and password" });
        }

        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = generateToken(user._id, user.role);

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
import Payment from "../models/payment.js";

/**
 * Get all payment records for admin dashboard
 * Route: GET /api/payments
 */
export const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: Could not fetch payments",
      error: error.message
    });
  }
};

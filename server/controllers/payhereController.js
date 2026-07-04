import crypto from "crypto";
import Booking from "../models/booking.js";
import WeddingBooking from "../models/weddingBooking.js";
import Order from "../models/order.js";
import Payment from "../models/payment.js";

// Helper to generate MD5 Hash
const generateMD5 = (string) => {
  return crypto.createHash("md5").update(string).digest("hex");
};

/**
 * Exposes endpoint to generate the required MD5 signature for launching the PayHere popup.
 * Route: POST /api/payments/payhere-hash
 */
export const generatePayHereHash = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Please provide orderId and amount",
      });
    }

    const merchantId = process.env.PAYHERE_MERCHANT_ID || "1224403";
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || "8MzQxMzg5MjQyOTQyODMwMTk5ODUzNDQ0NDYwNTEyNjE0NDcy";
    const currency = process.env.PAYHERE_CURRENCY || "LKR";

    // Format amount to 2 decimal places (PayHere requirement)
    const formattedAmount = Number(amount).toFixed(2);

    // 1. Hash the Merchant Secret and convert to UPPERCASE
    const hashedSecret = generateMD5(merchantSecret).toUpperCase();

    // 2. Hash the concatenated string: merchant_id + order_id + formatted_amount + currency + hashedSecret
    const rawString = merchantId + orderId + formattedAmount + currency + hashedSecret;
    const finalHash = generateMD5(rawString).toUpperCase();

    return res.status(200).json({
      success: true,
      data: {
        merchantId,
        currency,
        hash: finalHash,
        amount: formattedAmount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Handles Webhook notification POST requests directly from PayHere's servers.
 * Route: POST /api/payments/payhere-notify
 */
export const handlePayHereNotification = async (req, res) => {
  try {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      custom_1, // We can pass transaction type ('room', 'wedding', 'order') in custom_1
    } = req.body;

    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || "8MzQxMzg5MjQyOTQyODMwMTk5ODUzNDQ0NDYwNTEyNjE0NDcy";

    // 1. Recreate the verification MD5 signature hash
    const hashedSecret = generateMD5(merchantSecret).toUpperCase();
    const rawString = merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret;
    const localSignature = generateMD5(rawString).toUpperCase();

    // 2. Validate MD5 signature
    if (localSignature !== md5sig) {
      console.warn("Invalid PayHere signature callback intercepted!");
      return res.status(400).send("Invalid Signature Verification");
    }

    // 3. Process the payment if status_code is 2 (Success)
    if (status_code === "2") {
      const type = custom_1 || "room"; // fallback to room
      let userId = null;
      let onModelType = "Booking";

      if (type === "room") {
        // Update Room Booking
        const booking = await Booking.findById(order_id);
        if (booking) {
          booking.status = "confirmed";
          booking.paymentStatus = "Paid";
          await booking.save();
          userId = booking.user;
          onModelType = "Booking";
        }
      } else if (type === "wedding") {
        // Update Wedding Booking
        const booking = await WeddingBooking.findById(order_id);
        if (booking) {
          booking.bookingStatus = "confirmed";
          booking.paymentStatus = "Fully Paid"; // Assuming full payment via PayHere
          await booking.save();
          userId = booking.userId;
          onModelType = "WeddingBooking";
        }
      } else if (type === "order") {
        // Update Restaurant Order
        const order = await Order.findById(order_id);
        if (order) {
          order.paymentStatus = "Paid";
          order.orderStatus = "Completed";
          await order.save();
          userId = order.user;
          onModelType = "Order";
        }
      }

      try {
        await Payment.create({
          amount: parseFloat(payhere_amount),
          method: 'Online',
          status: 'Completed',
          user: userId || "000000000000000000000000", // Fallback for guest
          referenceId: order_id,
          onModel: onModelType
        });
      } catch (err) {
        console.error("Failed to create Payment log:", err);
      }
    }

    // PayHere requires a simple 200 text response
    return res.status(200).send("Callback Processed Successfully");
  } catch (error) {
    console.error("Error in PayHere notification:", error.message);
    return res.status(500).send(error.message);
  }
};

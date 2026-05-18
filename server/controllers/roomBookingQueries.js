import Booking from '../models/booking.js';

export const getBookings = async (req, res) => {
	try {
		// Optional filter: /bookings?status=confirmed
		const filter = {};
		if (req.query.status) {
			filter.status = req.query.status;
		}

		const bookings = await Booking.find(filter)
			.populate('room', 'name price')
			.populate('user', 'name email role')
			.sort({ createdAt: -1 });

		res.status(200).json({
			success: true,
			count: bookings.length,
			data: bookings
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};

export const getMonthlyRevenueReport = async (req, res) => {
	try {
		const now = new Date();
		// Defaults to current month/year when query params are not sent.
		const year = Number.parseInt(req.query.year, 10) || now.getFullYear();
		const month = Number.parseInt(req.query.month, 10) || now.getMonth() + 1;

		if (!Number.isInteger(year) || year < 2000 || year > 3000) {
			return res.status(400).json({
				success: false,
				message: 'Invalid year. Use a value like 2026'
			});
		}

		if (!Number.isInteger(month) || month < 1 || month > 12) {
			return res.status(400).json({
				success: false,
				message: 'Invalid month. Use values 1-12'
			});
		}

		// Month boundaries: [startDate, endDate)
		const startDate = new Date(year, month - 1, 1);
		const endDate = new Date(year, month, 1);

		// Aggregate non-cancelled bookings that start within selected month.
		const [result] = await Booking.aggregate([
			{
				$match: {
					status: { $ne: 'cancelled' },
					checkInDate: { $gte: startDate, $lt: endDate }
				}
			},
			{
				$group: {
					_id: null,
					totalRevenue: { $sum: '$totalPrice' },
					totalBookings: { $sum: 1 }
				}
			}
		]);

		res.status(200).json({
			success: true,
			data: {
				year,
				month,
				totalRevenue: result?.totalRevenue || 0,
				totalBookings: result?.totalBookings || 0
			}
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};

export const getMyBookings = async (req, res) => {
	try {
		const normalizedEmail = String(req.user.email).trim().toLowerCase();
		const bookings = await Booking.find({
			$or: [
				{ user: req.user._id },
				{ email: normalizedEmail }
			]
		})
			.populate('room', 'name price image')
			.sort({ createdAt: -1 });

		res.status(200).json({
			success: true,
			count: bookings.length,
			data: bookings
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};
		//This function gets a booking by ID and returns an error if it is not found.
export const getBookingById = async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.id)
			.populate('room', 'name price image')
			.populate('user', 'name email role');

		if (!booking) {
			return res.status(404).json({
				success: false,
				message: 'Booking not found'
			});
		}

		// Admin/staff can view all; normal users can only view their own booking.
		const canAccessAll = ['admin', 'manager', 'staff'].includes(req.user.role);
		const isOwner = booking.user && booking.user._id.toString() === req.user._id.toString();

		if (!canAccessAll && !isOwner) {
			return res.status(403).json({
				success: false,
				message: 'Not authorized to access this booking'
			});
		}

		res.status(200).json({
			success: true,
			data: booking
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};

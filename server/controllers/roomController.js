import Room from '../models/room.js';
import Booking from '../models/booking.js';

export const getAvailableRoomNumbers = async (req, res) => {
	try {
		const { id } = req.params;
		const { checkInDate, checkOutDate, checkInType, checkOutType, stayMode, variant } = req.query;

		if (!checkInDate || !checkOutDate) {
			return res.status(400).json({ success: false, message: 'Missing dates' });
		}

		const room = await Room.findById(id);
		if (!room) {
			return res.status(404).json({ success: false, message: 'Room not found' });
		}

		const startMs = new Date(checkInDate).getTime();
		const startIndex = (Math.floor(startMs / (1000 * 60 * 60 * 24)) * 2) + (checkInType === 'Night' ? 1 : 0);

		let endIndex;
		if (stayMode === 'onlyDay' || stayMode === 'onlyNight') {
			endIndex = startIndex;
		} else {
			const endMs = new Date(checkOutDate).getTime();
			endIndex = (Math.floor(endMs / (1000 * 60 * 60 * 24)) * 2) + (checkOutType === 'Night' ? 1 : 0);
		}

		const overlappingBookings = await Booking.find({
			room: room._id,
			status: { $ne: 'cancelled' },
			startIndex: { $lte: endIndex },
			endIndex: { $gte: startIndex }
		});

		const bookedRoomNumbers = overlappingBookings.map(b => b.roomNumber);

		const ROOM_START_NUMBERS = {
			'ac standard room': 1,
			'non-ac standard room': 4,
			'standard room': 1,
			'family room': 7,
			'family suite': 7,
			'wedding couple suite': 9,
			'honeymoon suite': 9,
		};
		const lower = (room.name || '').toLowerCase();
		const key = Object.keys(ROOM_START_NUMBERS).find(k => lower.includes(k) || k.includes(lower));
		const startNumber = key ? ROOM_START_NUMBERS[key] : 1;

		let allRoomNumbers = [];
		for (let i = 0; i < room.totalRooms; i++) {
			allRoomNumbers.push(`Room ${startNumber + i}`);
		}

		if (lower.includes('standard room') && variant) {
			if (variant === 'ac') {
				allRoomNumbers = allRoomNumbers.filter(num => ['Room 5', 'Room 6'].includes(num));
			} else if (variant === 'nonAc') {
				allRoomNumbers = allRoomNumbers.filter(num => ['Room 1', 'Room 2', 'Room 3', 'Room 4'].includes(num));
			}
		}

		const availableRoomNumbers = allRoomNumbers.filter(num => !bookedRoomNumbers.includes(num));

		res.status(200).json({
			success: true,
			data: availableRoomNumbers
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};

export const getAdminRooms = async (req, res) => {
	try {
		const { search, isActive, page = 1, limit = 20 } = req.query;
		const filters = {};

		if (isActive === 'true') {
			filters.isActive = true;
		}

		if (isActive === 'false') {
			filters.isActive = false;
		}

		if (search) {
			filters.$or = [
				{ name: { $regex: search, $options: 'i' } },//Case insensitive search.
				{ description: { $regex: search, $options: 'i' } }
			];
		}

		const parsedPage = Math.max(Number(page) || 1, 1);
		const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
		const skip = (parsedPage - 1) * parsedLimit;

		const [rooms, total] = await Promise.all([
			Room.find(filters).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit),//Do not load too much data once.
			Room.countDocuments(filters)//Calculate the total room count.
		]);

			//sends a successful response to the frontend
		res.status(200).json({
			success: true,
			count: rooms.length,
			total,
			page: parsedPage,
			pages: Math.ceil(total / parsedLimit),
			data: rooms
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};

//Generate admin dashboard statistics, Counts total, active, and inactive rooms.
export const getRoomAdminStats = async (req, res) => {
	try {
		const [totalRooms, activeRooms, inactiveRooms, totalAvailableCapacity, priceAgg] = await Promise.all([
			Room.countDocuments(),
			Room.countDocuments({ isActive: true }),
			Room.countDocuments({ isActive: false }),
			Room.aggregate([
				{ $match: { isActive: true } },
				{ $group: { _id: null, total: { $sum: '$availableRooms' } } }
			]),
			Room.aggregate([
				{ $match: { isActive: true } },
				{ $group: { _id: null, averagePrice: { $avg: '$price' }, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } }
			])
		]);

		res.status(200).json({
			success: true,
			data: {
				totalRooms,
				activeRooms,
				inactiveRooms,
				totalAvailableCapacity: totalAvailableCapacity[0]?.total || 0,
				averagePrice: priceAgg[0]?.averagePrice || 0,
				minPrice: priceAgg[0]?.minPrice || 0,
				maxPrice: priceAgg[0]?.maxPrice || 0
			}
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};


//Show available rooms to customers.
export const getRooms = async (req, res) => {
	try {
		const { minPrice, maxPrice, guests, search, onlyAvailable } = req.query;
		const filters = { isActive: true };

		if (minPrice || maxPrice) {
			filters.price = {};
			if (minPrice) {
				filters.price.$gte = Number(minPrice);
			}
			if (maxPrice) {
				filters.price.$lte = Number(maxPrice);
			}
		}

		if (guests) {
			filters.defaultGuests = { $gte: Number(guests) };
		}

		if (onlyAvailable === 'true') {
			filters.availableRooms = { $gt: 0 };
		}

		if (search) {
			filters.$or = [
				{ name: { $regex: search, $options: 'i' } },
				{ description: { $regex: search, $options: 'i' } }
			];
		}

		const rooms = await Room.find(filters).sort({ createdAt: -1 });

		// Dynamically calculate today's available rooms for each room
		const todayStr = new Date().toISOString().split('T')[0];
		const startMs = new Date(todayStr).getTime();
		const startIndex = (Math.floor(startMs / (1000 * 60 * 60 * 24)) * 2); // default to Day slot today
		
		const activeBookings = await Booking.find({
			status: { $ne: 'cancelled' },
			startIndex: { $lte: startIndex },
			endIndex: { $gte: startIndex }
		});

		const ROOM_START_NUMBERS = {
			'ac standard room': 5,
			'non-ac standard room': 1,
			'standard room': 1,
			'family room': 7,
			'family suite': 7,
			'wedding couple suite': 9,
			'honeymoon suite': 9,
		};

		const formattedRooms = rooms.map(room => {
			const lower = (room.name || '').toLowerCase();
			const key = Object.keys(ROOM_START_NUMBERS).find(k => lower.includes(k) || k.includes(lower));
			const startNumber = key ? ROOM_START_NUMBERS[key] : 1;

			const allRoomNumbers = [];
			for (let i = 0; i < room.totalRooms; i++) {
				allRoomNumbers.push(`Room ${startNumber + i}`);
			}

			const overlappingBookings = activeBookings.filter(b => b.room.toString() === room._id.toString());
			const bookedRoomNumbers = overlappingBookings.map(b => b.roomNumber).filter(Boolean);
			const availableCount = allRoomNumbers.filter(num => !bookedRoomNumbers.includes(num)).length;

			const roomObj = room.toObject();
			roomObj.availableRooms = availableCount;
			return roomObj;
		});

		res.status(200).json({
			success: true,
			count: formattedRooms.length,
			data: formattedRooms
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};


//get single room details.
export const getRoomById = async (req, res) => {
	try {
		const room = await Room.findOne({ _id: req.params.id, isActive: true });

		if (!room) {
			return res.status(404).json({
				success: false,
				message: 'Room not found'
			});
		}

		res.status(200).json({
			success: true,
			data: room
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};

export const createRoom = async (req, res) => {
	try {
		const room = await Room.create(req.body);

		res.status(201).json({
			success: true,
			data: room
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: error.message
		});
	}
};

export const updateRoom = async (req, res) => {
	try {
		const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true //Prevent invalid data.
		});

		if (!room) {
			return res.status(404).json({
				success: false,
				message: 'Room not found'
			});
		}

		res.status(200).json({
			success: true,
			data: room
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: error.message
		});
	}
};

export const deleteRoom = async (req, res) => {
	try {
		const room = await Room.findById(req.params.id);

		if (!room) {
			return res.status(404).json({
				success: false,
				message: 'Room not found'
			});
		}

		room.isActive = false;//It is hidden without removing it from the room database.
		await room.save();

		res.status(200).json({
			success: true,
			message: 'Room deleted successfully'
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};

export const restoreRoom = async (req, res) => {
	try {
		const room = await Room.findById(req.params.id);

		if (!room) {
			return res.status(404).json({
				success: false,
				message: 'Room not found'
			});
		}

		room.isActive = true;
		await room.save();

		res.status(200).json({
			success: true,
			message: 'Room restored successfully',
			data: room
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};

export const updateRoomAvailability = async (req, res) => {
	try {
		const { availableRooms } = req.body;

		if (!Number.isInteger(availableRooms) || availableRooms < 0) {
			return res.status(400).json({
				success: false,
				message: 'availableRooms must be a non-negative integer'
			});
		}

		const room = await Room.findById(req.params.id);
		if (!room) {
			return res.status(404).json({
				success: false,
				message: 'Room not found'
			});
		}

		room.availableRooms = availableRooms;
		await room.save();

		res.status(200).json({
			success: true,
			message: 'Room availability updated successfully',
			data: room
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};

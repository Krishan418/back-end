import Room from '../models/room.js';
import Booking from '../models/booking.js';

// Helper to deterministically assign room numbers globally, maintaining base allocations
// even when rooms are spread across multiple DB objects (e.g. legacy Standard Room + newly created variants)
const generateGlobalRoomNumbers = (allRooms) => {
	const tracker = {
		'non-ac standard room': { start: 1, max: 4, used: 0 },
		'ac standard room': { start: 5, max: 2, used: 0 },
		'family': { start: 7, max: 2, used: 0 },
		'wedding': { start: 9, max: 2, used: 0 },
	};
	let nextGlobalNumber = 11;
	const roomNumbersMap = {};

	const sortedRooms = [...allRooms].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

	for (const r of sortedRooms) {
		const lowerName = (r.name || '').toLowerCase().trim();
		const fallbackTotal = lowerName.includes('standard room') ? 6 : 2;
		let totalRoomsCount = r.totalRooms !== undefined ? r.totalRooms : fallbackTotal;
		// For legacy "Standard Room" (not specific AC/Non-AC variant), always ensure 6 rooms
		if (lowerName === 'standard room') {
			totalRoomsCount = Math.max(totalRoomsCount, 6);
		}
		
		let nums = [];
		for (let i = 0; i < totalRoomsCount; i++) {
			if (lowerName.includes('standard room')) {
				if (lowerName === 'ac standard room') {
					if (tracker['ac standard room'].used < tracker['ac standard room'].max) {
						nums.push(`Room ${tracker['ac standard room'].start + tracker['ac standard room'].used}`);
						tracker['ac standard room'].used++;
					} else {
						nums.push(`Room ${nextGlobalNumber++}`);
					}
				} else if (lowerName === 'non-ac standard room') {
					if (tracker['non-ac standard room'].used < tracker['non-ac standard room'].max) {
						nums.push(`Room ${tracker['non-ac standard room'].start + tracker['non-ac standard room'].used}`);
						tracker['non-ac standard room'].used++;
					} else {
						nums.push(`Room ${nextGlobalNumber++}`);
					}
				} else {
					// legacy 'standard room' - fill non-ac first, then ac, then global
					if (tracker['non-ac standard room'].used < tracker['non-ac standard room'].max) {
						nums.push(`Room ${tracker['non-ac standard room'].start + tracker['non-ac standard room'].used}`);
						tracker['non-ac standard room'].used++;
					} else if (tracker['ac standard room'].used < tracker['ac standard room'].max) {
						nums.push(`Room ${tracker['ac standard room'].start + tracker['ac standard room'].used}`);
						tracker['ac standard room'].used++;
					} else {
						nums.push(`Room ${nextGlobalNumber++}`);
					}
				}
			} else if (lowerName.includes('family')) {
				if (tracker['family'].used < tracker['family'].max) {
					nums.push(`Room ${tracker['family'].start + tracker['family'].used}`);
					tracker['family'].used++;
				} else {
					nums.push(`Room ${nextGlobalNumber++}`);
				}
			} else if (lowerName.includes('wedding') || lowerName.includes('honeymoon')) {
				if (tracker['wedding'].used < tracker['wedding'].max) {
					nums.push(`Room ${tracker['wedding'].start + tracker['wedding'].used}`);
					tracker['wedding'].used++;
				} else {
					nums.push(`Room ${nextGlobalNumber++}`);
				}
			} else {
				nums.push(`Room ${nextGlobalNumber++}`);
			}
		}
		roomNumbersMap[r._id.toString()] = nums;
	}
	return roomNumbersMap;
};

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

		// Fetch all active rooms to determine global numbering deterministically
		const allRooms = await Room.find({ isActive: { $ne: false } }).sort({ name: 1 });
		const roomNumbersMap = generateGlobalRoomNumbers(allRooms);

		const lower = (room.name || '').toLowerCase().trim();
		const isStandardVariant = lower.includes('standard room');

		let allRoomNumbers = [];

		if (isStandardVariant) {
			// Aggregate room numbers from ALL standard room DB documents
			// to handle cases where the admin created multiple records (e.g. AC, Non-AC, and Legacy)
			allRooms.forEach(r => {
				const rLower = (r.name || '').toLowerCase().trim();
				if (rLower.includes('standard room')) {
					const nums = roomNumbersMap[r._id.toString()] || [];
					allRoomNumbers.push(...nums);
				}
			});

			// Standardize the variant string requested by frontend (e.g., frontend passes 'ac' or 'nonAc')
			// If the user explicitly requested the 'ac' or 'nonAc' endpoint via query param, filter by that.
			if (variant === 'ac') {
				allRoomNumbers = allRoomNumbers.filter(num => parseInt(num.replace('Room ', '')) >= 5);
			} else if (variant === 'nonAc') {
				allRoomNumbers = allRoomNumbers.filter(num => parseInt(num.replace('Room ', '')) <= 4);
			} else if (lower === 'ac standard room') {
				// Fallback if variant isn't provided but the specific room was queried
				allRoomNumbers = allRoomNumbers.filter(num => parseInt(num.replace('Room ', '')) >= 5);
			} else if (lower === 'non-ac standard room') {
				allRoomNumbers = allRoomNumbers.filter(num => parseInt(num.replace('Room ', '')) <= 4);
			}
		} else {
			// Normal room logic (Honeymoon suite, etc.)
			allRoomNumbers = roomNumbersMap[room._id.toString()] || [];
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

		// Fetch all active rooms to calculate global numbers correctly (even if paginated)
		const allRooms = await Room.find({ isActive: { $ne: false } }).sort({ name: 1 });
		const roomNumbersMap = generateGlobalRoomNumbers(allRooms);

		const formattedRooms = rooms.map(room => {
			const roomObj = room.toObject();
			roomObj.allRoomNumbers = roomNumbersMap[room._id.toString()] || [];
			return roomObj;
		});

			//sends a successful response to the frontend
		res.status(200).json({
			success: true,
			count: formattedRooms.length,
			total,
			page: parsedPage,
			pages: Math.ceil(total / parsedLimit),
			data: formattedRooms
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

		// Pre-calculate room numbers for all active rooms globally
		const allRooms = await Room.find({ isActive: { $ne: false } }).sort({ name: 1 });
		const roomNumbersMap = generateGlobalRoomNumbers(allRooms);

		const formattedRooms = rooms.map(room => {
			const allRoomNumbers = roomNumbersMap[room._id.toString()] || [];

			const overlappingBookings = activeBookings.filter(b => b.room.toString() === room._id.toString());
			const bookedRoomNumbers = overlappingBookings.map(b => b.roomNumber).filter(Boolean);
			const availableCount = allRoomNumbers.filter(num => !bookedRoomNumbers.includes(num)).length;

			const roomObj = room.toObject();
			roomObj.availableRooms = availableCount;
			roomObj.allRoomNumbers = allRoomNumbers; // Expose the global room numbers list to the frontend
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
			returnDocument: 'after',
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

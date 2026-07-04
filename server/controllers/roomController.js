import Room from '../models/room.js';

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

		res.status(200).json({
			success: true,
			count: rooms.length,
			data: rooms
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

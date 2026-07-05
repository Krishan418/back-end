export const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export const CANCELLABLE_BY_USER = ['pending', 'confirmed'];

export const HONEYMOON_DECORATION_ITEMS = [
	{ name: 'Rose petals on bed', price: 2500 },
	{ name: 'Flower bouquet', price: 3000 },
	{ name: 'Scented candles', price: 1500 },
	{ name: 'Heart balloon setup', price: 1000 },
	{ name: 'Chocolate gift box', price: 2500 }
];

export const STATUS_TRANSITIONS = {
	pending: ['confirmed', 'cancelled'],
	confirmed: ['checked-in', 'cancelled'],
	'checked-in': ['checked-out'],
	'checked-out': [],
	cancelled: ['pending', 'confirmed']
};

/**
 * Calculates the total nights between check-in and check-out dates.
 * @param {string|Date} checkInDate - The starting date of the stay.
 * @param {string|Date} checkOutDate - The ending date of the stay.
 * @returns {number} The number of nights, rounded up.
 */
export const calculateNights = (checkInDate, checkOutDate) => {
	const diff = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
	return Math.ceil(diff / ONE_DAY_MS);
};

/**
 * Validates status transitions to ensure only authorized status flow is followed.
 * Allows same-status updates and valid next transitions only.
 * @param {string} fromStatus - The current status of the booking.
 * @param {string} toStatus - The target status to transition to.
 * @returns {boolean} True if the status transition is valid, false otherwise.
 */
export const isValidStatusTransition = (fromStatus, toStatus) => {
	if (fromStatus === toStatus) {
		return true;
	}

	return (STATUS_TRANSITIONS[fromStatus] || []).includes(toStatus);
};

/**
 * Filters the input array to keep only valid, unique honeymoon decoration options.
 * @param {Array<string>} items - The list of requested decoration item names.
 * @returns {Array<string>} A list of valid, unique decoration item names.
 */
export const sanitizeDecorationItems = (items) => {
	if (!Array.isArray(items)) {
		return [];
	}

	const validNames = HONEYMOON_DECORATION_ITEMS.map((i) => i.name);
	const uniqueItems = [...new Set(items.map((item) => String(item).trim()))];
	return uniqueItems.filter((item) => validNames.includes(item));
};

/**
 * Calculates the total price of all valid selected decorations.
 * @param {Array<string>} items - The list of decoration item names.
 * @returns {number} The cumulative price of the selected decorations.
 */
export const calculateDecorationTotal = (items) => {
	return items.reduce((sum, itemName) => {
		const item = HONEYMOON_DECORATION_ITEMS.find((i) => i.name === itemName);
		return sum + (item ? item.price : 0);
	}, 0);
};

/**
 * Safely rolls back a Mongoose/MongoDB session transaction and sends the API error response.
 * @param {Object} session - The active database session.
 * @param {Object} res - The Express response object.
 * @param {number} statusCode - The HTTP status code to respond with.
 * @param {Object} payload - The JSON payload to send in the response.
 * @returns {Promise<Object>} The sent Express response.
 */
export const abortTransactionWithResponse = async (session, res, statusCode, payload) => {
	if (session && session.inTransaction()) {
		await session.abortTransaction();
	}

	return res.status(statusCode).json(payload);
};
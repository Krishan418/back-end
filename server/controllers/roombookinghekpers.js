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

// Converts check-in/check-out dates into total nights.
export const calculateNights = (checkInDate, checkOutDate) => {
	const diff = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
	return Math.ceil(diff / ONE_DAY_MS);
};

// Allows same-status updates and valid next transitions only.
export const isValidStatusTransition = (fromStatus, toStatus) => {
	if (fromStatus === toStatus) {
		return true;
	}

	return (STATUS_TRANSITIONS[fromStatus] || []).includes(toStatus);
};

// Keeps only valid, unique honeymoon decoration options.
export const sanitizeDecorationItems = (items) => {
	if (!Array.isArray(items)) {
		return [];
	}

	const validNames = HONEYMOON_DECORATION_ITEMS.map((i) => i.name);
	const uniqueItems = [...new Set(items.map((item) => String(item).trim()))];
	return uniqueItems.filter((item) => validNames.includes(item));
};

// Calculates the total price of selected decorations.
export const calculateDecorationTotal = (items) => {
	return items.reduce((sum, itemName) => {
		const item = HONEYMOON_DECORATION_ITEMS.find((i) => i.name === itemName);
		return sum + (item ? item.price : 0);
	}, 0);
};

// Safely rolls back DB transaction, then sends API response.
export const abortTransactionWithResponse = async (session, res, statusCode, payload) => {
	if (session && session.inTransaction()) {
		await session.abortTransaction();
	}

	return res.status(statusCode).json(payload);
};

import Room from '../models/room.js';
import Booking from '../models/booking.js';
import PoolBooking from '../models/poolBooking.js';
import WeddingBooking from '../models/weddingBooking.js';
import Order from '../models/order.js';

// Get aggregated dashboard reports
// Route: GET /api/reports
export const getDashboardReports = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch all data concurrently
        const [rooms, bookings, poolBookings, weddingBookings, orders] = await Promise.all([
            Room.find(),
            Booking.find().populate('room'),
            PoolBooking.find(),
            WeddingBooking.find().populate('hallId', 'hallName capacity price status'),
            Order.find()
        ]);

        let roomsRev = 0;
        let roomsCount = 0;
        let cancelledCount = 0;
        const uniqueRoomsBookedToday = new Set();

        bookings.forEach(b => {
            if (b.status === 'cancelled') {
                cancelledCount++;
            } else {
                roomsRev += Number(b.totalPrice) || 0;
                roomsCount++;

                if (b.checkInDate && b.checkOutDate) {
                    const checkIn = new Date(b.checkInDate).toISOString().split('T')[0];
                    const checkOut = new Date(b.checkOutDate).toISOString().split('T')[0];
                    if (today >= checkIn && today < checkOut && b.room?._id) {
                        uniqueRoomsBookedToday.add(b.room._id.toString());
                    }
                }
            }
        });

        let poolRev = 0;
        let poolCount = 0;
        let poolGuestsToday = 0;
        poolBookings.forEach(b => {
            if (b.status === 'Cancelled') {
                cancelledCount++;
            } else {
                poolRev += Number(b.totalAmount) || 0;
                poolCount++;

                const bDate = b.date ? new Date(b.date).toISOString().split('T')[0] : null;
                if (bDate === today) {
                    poolGuestsToday += Number(b.numberOfGuests) || 0;
                }
            }
        });

        let weddingRev = 0;
        let weddingCount = 0;
        let confirmedWeddings = 0;
        weddingBookings.forEach(b => {
            if (b.bookingStatus === 'cancelled' || b.bookingStatus === 'rejected') {
                cancelledCount++;
            } else {
                const amount = Number(b.totalAmount) || Number(b.hallId?.price) || 0;
                weddingRev += amount;
                weddingCount++;
                if (b.bookingStatus === 'confirmed') confirmedWeddings++;
            }
        });

        let restaurantRev = 0;
        let orderCount = 0;
        let completedOrders = 0;
        orders.forEach(o => {
            if (o.status === 'Cancelled') {
                cancelledCount++;
            } else {
                restaurantRev += Number(o.totalAmount) || 0;
                orderCount++;
                if (o.status === 'Completed' || o.status === 'Paid') completedOrders++;
            }
        });

        const totalRev = roomsRev + poolRev + weddingRev + restaurantRev;
        const totalBook = roomsCount + poolCount + weddingCount + orderCount;
        const avgDaily = totalRev / 30;

        const sData = [
            { name: 'Rooms', value: roomsRev, color: '#3B82F6' },
            { name: 'Restaurant', value: restaurantRev, color: '#F59E0B' },
            { name: 'Wedding', value: weddingRev, color: '#EC4899' },
            { name: 'Pool', value: poolRev, color: '#10B981' },
        ];

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyStats = Array(12).fill(0).map((_, i) => ({ month: monthNames[i], bookings: 0, revenue: 0 }));

        const processItem = (dateStr, amount) => {
            try {
                if (!dateStr) return;
                const d = new Date(dateStr);
                const m = d.getMonth();
                if (m >= 0 && m < 12) {
                    monthlyStats[m].bookings += 1;
                    monthlyStats[m].revenue += amount;
                }
            } catch (e) { }
        }

        bookings.forEach(b => { if (b.status !== 'cancelled') processItem(b.createdAt || b.checkInDate, Number(b.totalPrice) || 0) });
        poolBookings.forEach(b => { if (b.status !== 'Cancelled') processItem(b.createdAt || b.date, Number(b.totalAmount) || 0) });
        weddingBookings.forEach(b => { if (b.bookingStatus !== 'cancelled' && b.bookingStatus !== 'rejected') processItem(b.createdAt || b.eventDate, Number(b.totalAmount) || Number(b.hallId?.price) || 0) });
        orders.forEach(o => { if (o.status !== 'Cancelled') processItem(o.createdAt, Number(o.totalAmount) || 0) });

        const currentMonth = new Date().getMonth();
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const mIndex = (currentMonth - i + 12) % 12;
            last6Months.push(monthlyStats[mIndex]);
        }

        const totalRoomsCount = rooms.length > 0 ? rooms.length : 20;
        const occupancyRate = Math.min(100, Math.round((uniqueRoomsBookedToday.size / totalRoomsCount) * 100));
        const orderFulfillment = orderCount > 0 ? Math.round((completedOrders / orderCount) * 100) : 0;
        const poolUtilization = Math.min(100, Math.round((poolGuestsToday / 60) * 100));
        const weddingConfirmation = weddingCount > 0 ? Math.round((confirmedWeddings / weddingCount) * 100) : 0;
        const totalTransactions = totalBook + cancelledCount;
        const cancellationRate = totalTransactions > 0 ? Math.round((cancelledCount / totalTransactions) * 100) : 0;

        const dynamicMetrics = [
            { label: 'Today\'s Occupancy Rate', value: `${occupancyRate}%`, width: `${occupancyRate}%`, color: 'bg-blue-600' },
            { label: 'Order Fulfillment Rate', value: `${orderFulfillment}%`, width: `${orderFulfillment}%`, color: 'bg-orange-600' },
            { label: 'Today\'s Pool Utilization', value: `${poolUtilization}%`, width: `${poolUtilization}%`, color: 'bg-cyan-600' },
            { label: 'Event Confirmation Rate', value: `${weddingConfirmation}%`, width: `${weddingConfirmation}%`, color: 'bg-pink-600' },
            { label: 'Overall Cancellation Rate', value: `${cancellationRate}%`, width: `${cancellationRate}%`, color: 'bg-red-600' },
        ];

        return res.status(200).json({
            success: true,
            data: {
                serviceData: sData,
                bookingData: last6Months.map(m => ({ month: m.month, bookings: m.bookings })),
                revenueData: last6Months.map(m => ({ month: m.month, revenue: m.revenue })),
                totalRevenue: totalRev,
                totalBookings: totalBook,
                avgDailyRevenue: avgDaily,
                metrics: dynamicMetrics
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

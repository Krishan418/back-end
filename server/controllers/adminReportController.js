import Room from '../models/room.js';
import Booking from '../models/booking.js';
import PoolBooking from '../models/poolBooking.js';
import WeddingBooking from '../models/weddingBooking.js';
import Order from '../models/order.js';
import Settings from '../models/Settings.js';
import sendEmail from '../utils/email.js';

// Get aggregated dashboard reports
// Route: GET /api/reports
export const getDashboardReports = async (req, res) => {
    try {
        const { dateRange } = req.query;
        let startDate = null;
        let endDate = null;
        if (dateRange && dateRange !== 'All Time') {
            const now = new Date();
            if (dateRange === 'Today') {
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            } else if (dateRange === 'This Week') {
                startDate = new Date(now.setDate(now.getDate() - now.getDay()));
                startDate.setHours(0,0,0,0);
            } else if (dateRange === 'This Month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            } else if (dateRange === 'Last Month') {
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 1);
            } else if (dateRange === 'This Quarter') {
                startDate = new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1);
            } else if (dateRange === 'This Year') {
                startDate = new Date(now.getFullYear(), 0, 1);
            }
        }

        const isDateInRange = (dateStr) => {
            if (!startDate && !endDate) return true;
            if (!dateStr) return false;
            const d = new Date(dateStr);
            if (startDate && d < startDate) return false;
            if (endDate && d >= endDate) return false;
            return true;
        };

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
        
        let todayCheckIns = 0;
        let todayCheckOuts = 0;

        bookings.forEach(b => {
            if (b.status === 'cancelled') {
                if (isDateInRange(b.createdAt || b.checkInDate)) cancelledCount++;
            } else {
                if (isDateInRange(b.createdAt || b.checkInDate)) {
                    roomsRev += Number(b.totalPrice) || 0;
                    roomsCount++;
                }

                if (b.checkInDate && b.checkOutDate) {
                    const checkIn = new Date(b.checkInDate).toISOString().split('T')[0];
                    const checkOut = new Date(b.checkOutDate).toISOString().split('T')[0];
                    
                    if (checkIn === today) todayCheckIns++;
                    if (checkOut === today) todayCheckOuts++;

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
                if (isDateInRange(b.createdAt || b.date)) cancelledCount++;
            } else {
                if (isDateInRange(b.createdAt || b.date)) {
                    poolRev += Number(b.totalAmount) || 0;
                    poolCount++;
                }

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
                if (isDateInRange(b.createdAt || b.eventDate)) cancelledCount++;
            } else {
                if (isDateInRange(b.createdAt || b.eventDate)) {
                    const amount = Number(b.totalAmount) || Number(b.hallId?.price) || 0;
                    weddingRev += amount;
                    weddingCount++;
                    if (b.bookingStatus === 'confirmed') confirmedWeddings++;
                }
            }
        });

        let restaurantRev = 0;
        let orderCount = 0;
        let completedOrders = 0;
        orders.forEach(o => {
            if (o.status === 'Cancelled') {
                if (isDateInRange(o.createdAt)) cancelledCount++;
            } else {
                if (isDateInRange(o.createdAt)) {
                    restaurantRev += Number(o.totalAmount) || 0;
                    orderCount++;
                    if (o.status === 'Completed' || o.status === 'Paid') completedOrders++;
                }
            }
        });

        const totalRev = roomsRev + poolRev + weddingRev + restaurantRev;
        const totalBook = roomsCount + poolCount + weddingCount + orderCount;

        let daysInPeriod = 30;
        if (dateRange === 'Today') daysInPeriod = 1;
        else if (dateRange === 'This Week') daysInPeriod = 7;
        else if (dateRange === 'Last Month') daysInPeriod = 30;
        else if (dateRange === 'This Quarter') daysInPeriod = 90;
        else if (dateRange === 'This Year') daysInPeriod = 365;
        else if (dateRange === 'All Time') daysInPeriod = 365;
        const avgDaily = totalRev / daysInPeriod;

        const sData = [
            { name: 'Rooms', value: roomsRev, color: '#3B82F6' },
            { name: 'Restaurant', value: restaurantRev, color: '#F59E0B' },
            { name: 'Wedding', value: weddingRev, color: '#EC4899' },
            { name: 'Pool', value: poolRev, color: '#10B981' },
        ];

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyStats = Array(12).fill(0).map((_, i) => ({ month: monthNames[i], bookings: 0, revenue: 0 }));

        //boking is relatad to witch month
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
        const availableRooms = totalRoomsCount - uniqueRoomsBookedToday.size;

        const weeklyOccupancy = [];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            const dDay = dayNames[d.getDay()];

            let occupiedThatDay = new Set();
            bookings.forEach(b => {
                if (b.status !== 'cancelled' && b.checkInDate && b.checkOutDate) {
                    const checkIn = new Date(b.checkInDate).toISOString().split('T')[0];
                    const checkOut = new Date(b.checkOutDate).toISOString().split('T')[0];
                    if (dStr >= checkIn && dStr < checkOut && b.room?._id) {
                        occupiedThatDay.add(b.room._id.toString());
                    }
                }
            });
            const occupancyPercentage = Math.round((occupiedThatDay.size / totalRoomsCount) * 100);
            weeklyOccupancy.push({ day: dDay, occupancy: Math.min(100, occupancyPercentage) });
        }

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
                metrics: dynamicMetrics,
                todayCheckIns,
                todayCheckOuts,
                availableRooms,
                weeklyOccupancy,
                occupancyRate
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Export dashboard report to admin email
// Route: POST /api/reports/export
export const exportReport = async (req, res) => {
    try {
        const { dateRange, email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Admin email is required' });
        }

        // Fetch settings for hotel name
        const settings = await Settings.findOne() || { hotelName: 'Hotel Janro' };
        const hotelName = settings.hotelName;

        // Log to console
        console.log(`Exporting ${dateRange} report to ${email}`);

        // For simplicity in this step, we'll send a summary report.
        // In a production app, you might want to call the calculation logic again
        // or pass the calculated data from the frontend.
        
        const html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: auto;">
                <div style="text-align: center; border-bottom: 2px solid #D4AF37; padding-bottom: 10px; margin-bottom: 20px;">
                    <h1 style="color: #0F172A; margin: 0;">${hotelName}</h1>
                    <p style="color: #64748B; margin: 5px 0;">Administrative Report Export</p>
                </div>
                
                <h2 style="color: #1E293B;">Report Summary: ${dateRange}</h2>
                <p style="color: #475569;">Hello Admin, here is the requested data export from your dashboard.</p>
                
                <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0; color: #1E293B;"><strong>Export Date:</strong> ${new Date().toLocaleString()}</p>
                    <p style="margin: 5px 0; color: #1E293B;"><strong>Report Period:</strong> ${dateRange}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <tr style="background: #F1F5F9;">
                        <th style="text-align: left; padding: 10px; border-bottom: 1px solid #E2E8F0;">Category</th>
                        <th style="text-align: right; padding: 10px; border-bottom: 1px solid #E2E8F0;">Status</th>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #F1F5F9;">Data Generation</td>
                        <td style="padding: 10px; border-bottom: 1px solid #F1F5F9; text-align: right; color: #10B981;">Success</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #F1F5F9;">System Status</td>
                        <td style="padding: 10px; border-bottom: 1px solid #F1F5F9; text-align: right; color: #10B981;">Active</td>
                    </tr>
                </table>

                <div style="margin-top: 30px; padding: 15px; background: #FFFBEB; border-left: 4px solid #F59E0B; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px; color: #92400E;">
                        <strong>Note:</strong> Detailed CSV/PDF attachments are currently being optimized. This summary confirms your export trigger is active.
                    </p>
                </div>

                <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #94A3B8;">
                    <p>&copy; ${new Date().getFullYear()} ${hotelName}. All rights reserved.</p>
                </div>
            </div>
        `;

        await sendEmail({
            email: email,
            subject: `${hotelName} - Report Export (${dateRange})`,
            message: `Your requested report for ${dateRange} has been generated.`,
            html: html,
            hotelName: hotelName
        });

        return res.status(200).json({
            success: true,
            message: `Report for ${dateRange} has been sent to ${email}!`
        });
    } catch (error) {
        console.error("REPORT EXPORT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

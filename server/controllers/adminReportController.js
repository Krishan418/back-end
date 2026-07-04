import Room from '../models/room.js';
import Booking from '../models/booking.js';
import PoolBooking from '../models/poolBooking.js';
import WeddingBooking from '../models/weddingBooking.js';
import WeddingHall from '../models/weddingHall.js';
import Order from '../models/order.js';
import Settings from '../models/Settings.js';
import sendEmail from '../utils/email.js';

// CSV Formatting helper
const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

// CSV Generators for report attachments
const makeRoomBookingsCsv = (bookings, currencySymbol) => {
    let csv = 'Booking ID,Customer Name,Email,Phone,Guests,Check-in Date,Check-out Date,Nights,Total Price (' + currencySymbol + '),Status,Created At\n';
    bookings.forEach(b => {
        const checkIn = b.checkInDate ? new Date(b.checkInDate).toLocaleDateString() : '';
        const checkOut = b.checkOutDate ? new Date(b.checkOutDate).toLocaleDateString() : '';
        const createdAt = b.createdAt ? new Date(b.createdAt).toLocaleString() : '';
        csv += `${escapeCSV(b._id)},${escapeCSV(b.fullName)},${escapeCSV(b.email)},${escapeCSV(b.phone)},${escapeCSV(b.guests)},${escapeCSV(checkIn)},${escapeCSV(checkOut)},${escapeCSV(b.nights)},${escapeCSV(b.totalPrice)},${escapeCSV(b.status)},${escapeCSV(createdAt)}\n`;
    });
    return csv;
};

const makePoolBookingsCsv = (bookings, currencySymbol) => {
    let csv = 'Booking ID,Guest Name,Email,Phone,Date,Time Slot,Check-in Time,Check-out Time,Guests,Total Amount (' + currencySymbol + '),Status,Created At\n';
    bookings.forEach(b => {
        const date = b.date ? new Date(b.date).toLocaleDateString() : '';
        const createdAt = b.createdAt ? new Date(b.createdAt).toLocaleString() : '';
        csv += `${escapeCSV(b._id)},${escapeCSV(b.guestName)},${escapeCSV(b.guestEmail)},${escapeCSV(b.guestPhone)},${escapeCSV(date)},${escapeCSV(b.timeSlot)},${escapeCSV(b.checkInTime)},${escapeCSV(b.checkOutTime)},${escapeCSV(b.numberOfGuests)},${escapeCSV(b.totalAmount)},${escapeCSV(b.status)},${escapeCSV(createdAt)}\n`;
    });
    return csv;
};

const makeWeddingBookingsCsv = (bookings, currencySymbol) => {
    let csv = 'Booking ID,Customer Name,Email,Phone,Event Date,Event Type,Venue Preference,Time Slot,Guest Count,Total Amount (' + currencySymbol + '),Booking Status,Created At\n';
    bookings.forEach(b => {
        const eventDate = b.eventDate ? new Date(b.eventDate).toLocaleDateString() : '';
        const createdAt = b.createdAt ? new Date(b.createdAt).toLocaleString() : '';
        csv += `${escapeCSV(b._id)},${escapeCSV(b.customerName)},${escapeCSV(b.customerEmail)},${escapeCSV(b.customerPhone)},${escapeCSV(eventDate)},${escapeCSV(b.eventType)},${escapeCSV(b.venuePreference)},${escapeCSV(b.timeSlot)},${escapeCSV(b.guestCount)},${escapeCSV(b.totalAmount)},${escapeCSV(b.bookingStatus)},${escapeCSV(createdAt)}\n`;
    });
    return csv;
};

const makeRestaurantOrdersCsv = (orders, currencySymbol) => {
    let csv = 'Order Number,Order ID,Customer Name,Order Type,Order Status,Payment Status,Subtotal (' + currencySymbol + '),Total Amount (' + currencySymbol + '),Created At\n';
    orders.forEach(o => {
        const createdAt = o.createdAt ? new Date(o.createdAt).toLocaleString() : '';
        csv += `${escapeCSV(o.orderNumber)},${escapeCSV(o._id)},${escapeCSV(o.customerName)},${escapeCSV(o.orderType)},${escapeCSV(o.orderStatus)},${escapeCSV(o.paymentStatus)},${escapeCSV(o.subtotal)},${escapeCSV(o.totalAmount)},${escapeCSV(createdAt)}\n`;
    });
    return csv;
};

// Calculate report details helper function
const calculateReportDetails = async (dateRange) => {
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
        if (o.orderStatus === 'Cancelled') {
            if (isDateInRange(o.createdAt)) cancelledCount++;
        } else {
            if (isDateInRange(o.createdAt)) {
                restaurantRev += Number(o.totalAmount) || 0;
                orderCount++;
                if (o.orderStatus === 'Completed' || o.paymentStatus === 'Paid') completedOrders++;
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

    //booking is related to which month
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
    };

    bookings.forEach(b => { if (b.status !== 'cancelled') processItem(b.createdAt || b.checkInDate, Number(b.totalPrice) || 0) });
    poolBookings.forEach(b => { if (b.status !== 'Cancelled') processItem(b.createdAt || b.date, Number(b.totalAmount) || 0) });
    weddingBookings.forEach(b => { if (b.bookingStatus !== 'cancelled' && b.bookingStatus !== 'rejected') processItem(b.createdAt || b.eventDate, Number(b.totalAmount) || Number(b.hallId?.price) || 0) });
    orders.forEach(o => { if (o.orderStatus !== 'Cancelled') processItem(o.createdAt, Number(o.totalAmount) || 0) });

    const currentMonth = new Date().getMonth();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
        const mIndex = (currentMonth - i + 12) % 12;
        last6Months.push(monthlyStats[mIndex]);
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();

    const isDateInCurrentMonth = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonthIndex;
    };

    let monthlyRev = 0;
    bookings.forEach(b => {
        if (b.status !== 'cancelled' && isDateInCurrentMonth(b.createdAt || b.checkInDate)) {
            monthlyRev += Number(b.totalPrice) || 0;
        }
    });
    poolBookings.forEach(b => {
        if (b.status !== 'Cancelled' && isDateInCurrentMonth(b.createdAt || b.date)) {
            monthlyRev += Number(b.totalAmount) || 0;
        }
    });
    weddingBookings.forEach(b => {
        if (b.bookingStatus !== 'cancelled' && b.bookingStatus !== 'rejected' && isDateInCurrentMonth(b.createdAt || b.eventDate)) {
            monthlyRev += Number(b.totalAmount) || Number(b.hallId?.price) || 0;
        }
    });
    orders.forEach(o => {
        if (o.orderStatus !== 'Cancelled' && isDateInCurrentMonth(o.createdAt)) {
            monthlyRev += Number(o.totalAmount) || 0;
        }
    });

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
        { label: "Today's Occupancy Rate", value: `${occupancyRate}%`, width: `${occupancyRate}%`, color: 'bg-blue-600' },
        { label: 'Order Fulfillment Rate', value: `${orderFulfillment}%`, width: `${orderFulfillment}%`, color: 'bg-orange-600' },
        { label: "Today's Pool Utilization", value: `${poolUtilization}%`, width: `${poolUtilization}%`, color: 'bg-cyan-600' },
        { label: 'Event Confirmation Rate', value: `${weddingConfirmation}%`, width: `${weddingConfirmation}%`, color: 'bg-pink-600' },
        { label: 'Overall Cancellation Rate', value: `${cancellationRate}%`, width: `${cancellationRate}%`, color: 'bg-red-600' },
    ];

    // Filter records within date range to send as CSV
    const filteredBookings = bookings.filter(b => isDateInRange(b.createdAt || b.checkInDate));
    const filteredPoolBookings = poolBookings.filter(b => isDateInRange(b.createdAt || b.date));
    const filteredWeddingBookings = weddingBookings.filter(b => isDateInRange(b.createdAt || b.eventDate));
    const filteredOrders = orders.filter(o => isDateInRange(o.createdAt));

    return {
        serviceData: sData,
        bookingData: last6Months.map(m => ({ month: m.month, bookings: m.bookings })),
        revenueData: last6Months.map(m => ({ month: m.month, revenue: m.revenue })),
        totalRevenue: totalRev,
        monthlyRevenue: monthlyRev,
        totalBookings: totalBook,
        avgDailyRevenue: avgDaily,
        metrics: dynamicMetrics,
        todayCheckIns,
        todayCheckOuts,
        availableRooms,
        weeklyOccupancy,
        occupancyRate,
        details: {
            bookings: filteredBookings,
            poolBookings: filteredPoolBookings,
            weddingBookings: filteredWeddingBookings,
            orders: filteredOrders
        }
    };
};

// Get aggregated dashboard reports
// Route: GET /api/reports
export const getDashboardReports = async (req, res) => {
    try {
        const { dateRange } = req.query;
        const reportData = await calculateReportDetails(dateRange);
        
        // Remove raw details lists from public API response to keep payload size small
        const { details, ...publicData } = reportData;

        return res.status(200).json({
            success: true,
            data: publicData
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

        // Fetch settings for hotel name and currency
        const settings = await Settings.findOne() || { hotelName: 'Hotel Janro', currency: { symbol: '$' } };
        const hotelName = settings.hotelName;
        const currencySymbol = (settings.currency && settings.currency.symbol) || '$';

        console.log(`Exporting ${dateRange} report to ${email}`);

        // Calculate all report numbers dynamically
        const reportData = await calculateReportDetails(dateRange);
        const { totalRevenue, avgDailyRevenue, totalBookings, serviceData, metrics } = reportData;

        // Construct a premium HTML email body
        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 30px; margin: 0;">
                <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 35px 30px; text-align: center;">
                        <span style="color: #D4AF37; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 8px;">${hotelName}</span>
                        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; font-family: 'Georgia', serif;">Business Analytics Report</h1>
                        <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0 0;">Period: <strong style="color: #f1f5f9;">${dateRange}</strong></p>
                    </div>

                    <!-- Content Body -->
                    <div style="padding: 30px;">
                        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                            Hello Admin,<br><br>
                            Here is the requested business performance report generated on <strong>${new Date().toLocaleString()}</strong>. Below is a summary of key metrics and a breakdown of performance across services.
                        </p>

                        <!-- Metrics Grid -->
                        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #f1f5f9; margin-bottom: 25px;">
                            <h3 style="color: #0f172a; margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Key Financial Highlights</h3>
                            
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #475569; font-size: 14px;">Total Revenue</td>
                                    <td style="padding: 8px 0; text-align: right; color: #0f172a; font-size: 16px; font-weight: 700;">${currencySymbol}${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #475569; font-size: 14px;">Avg. Daily Revenue</td>
                                    <td style="padding: 8px 0; text-align: right; color: #0f172a; font-size: 15px; font-weight: 600;">${currencySymbol}${avgDailyRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #475569; font-size: 14px;">Total Bookings/Orders</td>
                                    <td style="padding: 8px 0; text-align: right; color: #0f172a; font-size: 15px; font-weight: 600;">${totalBookings}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Revenue by Service -->
                        <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">Revenue by Service</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                            <thead>
                                <tr style="background-color: #f1f5f9;">
                                    <th style="padding: 10px 12px; text-align: left; color: #475569; font-size: 12px; font-weight: 600; border-bottom: 2px solid #e2e8f0; border-top-left-radius: 6px; border-bottom-left-radius: 6px;">Service Type</th>
                                    <th style="padding: 10px 12px; text-align: right; color: #475569; font-size: 12px; font-weight: 600; border-bottom: 2px solid #e2e8f0;">Revenue</th>
                                    <th style="padding: 10px 12px; text-align: right; color: #475569; font-size: 12px; font-weight: 600; border-bottom: 2px solid #e2e8f0; border-top-right-radius: 6px; border-bottom-right-radius: 6px;">Contribution</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${serviceData.map(service => {
                                    const pct = totalRevenue > 0 ? ((service.value / totalRevenue) * 100).toFixed(1) : '0.0';
                                    return `
                                    <tr>
                                        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 500;">
                                            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${service.color}; margin-right: 8px;"></span>
                                            ${service.name}
                                        </td>
                                        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #0f172a; font-size: 14px; font-weight: 600;">${currencySymbol}${service.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #64748b; font-size: 14px;">${pct}%</td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>

                        <!-- Performance Metrics -->
                        <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">Performance & Efficiency Metrics</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                            <tbody>
                                ${metrics.map(metric => `
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #475569; font-size: 13px;">${metric.label}</td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #0f172a; font-size: 13px; font-weight: 600;">${metric.value}</td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <!-- Attachment Notice -->
                        <div style="margin-top: 30px; padding: 15px 20px; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 6px;">
                            <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.5;">
                                <strong>CSV Attachments Included:</strong> Detailed reports for each service containing individual transactions and bookings for the requested period are attached to this email.
                            </p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                            This report is auto-generated by the ${hotelName} Administrative Portal.<br>
                            Please do not reply directly to this email.
                        </p>
                        <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">
                            &copy; ${new Date().getFullYear()} ${hotelName}. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        `;

        // Generate CSV attachments
        const attachments = [];
        const dateRangeStr = dateRange.replace(/\s+/g, '_');

        if (reportData.details.bookings.length > 0) {
            attachments.push({
                filename: `Room_Bookings_${dateRangeStr}.csv`,
                content: makeRoomBookingsCsv(reportData.details.bookings, currencySymbol)
            });
        }
        if (reportData.details.poolBookings.length > 0) {
            attachments.push({
                filename: `Pool_Bookings_${dateRangeStr}.csv`,
                content: makePoolBookingsCsv(reportData.details.poolBookings, currencySymbol)
            });
        }
        if (reportData.details.weddingBookings.length > 0) {
            attachments.push({
                filename: `Wedding_Bookings_${dateRangeStr}.csv`,
                content: makeWeddingBookingsCsv(reportData.details.weddingBookings, currencySymbol)
            });
        }
        if (reportData.details.orders.length > 0) {
            attachments.push({
                filename: `Restaurant_Orders_${dateRangeStr}.csv`,
                content: makeRestaurantOrdersCsv(reportData.details.orders, currencySymbol)
            });
        }

        await sendEmail({
            email: email,
            subject: `${hotelName} - Report Export (${dateRange})`,
            message: `Your requested report for ${dateRange} has been generated.`,
            html: html,
            hotelName: hotelName,
            attachments: attachments
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

// Download dashboard report as CSV directly to the user's device
// Route: GET /api/reports/download
export const downloadReport = async (req, res) => {
    try {
        const { dateRange, category } = req.query;
        
        if (!dateRange || !category) {
            return res.status(400).json({ success: false, message: 'Date range and category are required' });
        }

        // Fetch settings for currency
        const settings = await Settings.findOne() || { currency: { symbol: '$' } };
        const currencySymbol = (settings.currency && settings.currency.symbol) || '$';

        console.log(`Downloading ${category} report for ${dateRange}`);

        // Calculate all report numbers dynamically
        const reportData = await calculateReportDetails(dateRange);
        
        let csvContent = '';
        let filename = '';
        const dateRangeStr = dateRange.replace(/\s+/g, '_');

        if (category === 'rooms') {
            csvContent = makeRoomBookingsCsv(reportData.details.bookings, currencySymbol);
            filename = `Room_Bookings_${dateRangeStr}.csv`;
        } else if (category === 'pool') {
            csvContent = makePoolBookingsCsv(reportData.details.poolBookings, currencySymbol);
            filename = `Pool_Bookings_${dateRangeStr}.csv`;
        } else if (category === 'wedding') {
            csvContent = makeWeddingBookingsCsv(reportData.details.weddingBookings, currencySymbol);
            filename = `Wedding_Bookings_${dateRangeStr}.csv`;
        } else if (category === 'restaurant') {
            csvContent = makeRestaurantOrdersCsv(reportData.details.orders, currencySymbol);
            filename = `Restaurant_Orders_${dateRangeStr}.csv`;
        } else {
            return res.status(400).json({ success: false, message: 'Invalid report category' });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(csvContent);

    } catch (error) {
        console.error("REPORT DOWNLOAD ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


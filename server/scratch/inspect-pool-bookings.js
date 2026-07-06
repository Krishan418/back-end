import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import mongoose from 'mongoose';
import PoolBooking from '../models/poolBooking.js';

const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
    
    return date1.toLocaleDateString('en-US', { timeZone: 'Asia/Colombo' }) ===
           date2.toLocaleDateString('en-US', { timeZone: 'Asia/Colombo' });
};

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected.');

        const allBookings = await PoolBooking.find({ status: { $ne: 'Cancelled' } });
        console.log(`Total active bookings in DB: ${allBookings.length}`);

        console.log('\n--- Bookings on/around July 12th, 2026 ---');
        const targetDateStr = '2026-07-12';
        const targetDate = new Date(targetDateStr);

        const targetBookings = allBookings.filter(b => isSameDay(b.date, targetDate));
        console.log(`Bookings count on July 12, 2026: ${targetBookings.length}`);
        
        targetBookings.forEach(b => {
            console.log(`ID: ${b._id || b.id}, Guest: ${b.guestName}, Guests count: ${b.numberOfGuests}, Slot: ${b.timeSlot}, Status: ${b.status}, Date stored: ${b.date.toISOString()}`);
        });

        // Run the capacity calculation logic
        console.log('\n--- Running capacity check for Afternoon Slot on July 12th, 2026 ---');
        const targetTimeSlot = 'Afternoon Slot';
        const guestsToBook = 1;
        
        const bookingDate = new Date(targetDateStr);
        bookingDate.setHours(0, 0, 0, 0);

        const queryDate = new Date(bookingDate);
        const startDate = new Date(queryDate);
        startDate.setDate(startDate.getDate() - 2);
        const endDate = new Date(queryDate);
        endDate.setDate(endDate.getDate() + 2);

        console.log(`Query Date: ${queryDate.toISOString()}`);
        console.log(`Start Date: ${startDate.toISOString()}`);
        console.log(`End Date: ${endDate.toISOString()}`);

        const query = {
            date: { $gte: startDate, $lte: endDate },
            timeSlot: targetTimeSlot,
            status: { $ne: 'Cancelled' }
        };

        const dbBookings = await PoolBooking.find(query);
        console.log(`DB matched bookings in date range: ${dbBookings.length}`);
        dbBookings.forEach(b => {
            console.log(`  ID: ${b._id}, Date in DB: ${b.date.toISOString()}, Slot: ${b.timeSlot}, Guests: ${b.numberOfGuests}`);
        });

        const sameDayBookings = dbBookings.filter(b => isSameDay(b.date, queryDate));
        console.log(`Filtered sameDayBookings count: ${sameDayBookings.length}`);
        sameDayBookings.forEach(b => {
            console.log(`  Matched: ID: ${b._id}, Date: ${b.date.toISOString()}, Guests: ${b.numberOfGuests}`);
        });

        const currentCount = sameDayBookings.reduce((sum, b) => sum + b.numberOfGuests, 0);
        const maxCapacity = 20;
        console.log(`Current Count: ${currentCount}`);
        console.log(`Max Capacity: ${maxCapacity}`);
        console.log(`Is Over Limit if we add ${guestsToBook} guest(s): ${currentCount + guestsToBook > maxCapacity}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

inspect();

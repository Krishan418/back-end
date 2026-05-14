import dotenv from 'dotenv';
import { sendPoolBookingSMS } from '../utils/sms.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from the server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
    console.log('--- Twilio SMS Test ---');
    console.log('ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Found' : '❌ Missing');
    console.log('AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Found' : '❌ Missing');
    console.log('PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || '❌ Missing');

    const testDetails = {
        guestName: 'Test User',
        guestPhone: '0767860492', // Change this to your real number for testing!
        checkInTime: '10:00',
        checkOutTime: '12:00',
        numberOfGuests: 2,
        totalAmount: 1000
    };

    console.log('\nSending test SMS...');
    const result = await sendPoolBookingSMS(testDetails);
    
    if (result.success) {
        console.log('\n✅ SUCCESS!');
        console.log('Message SID:', result.sid);
    } else {
        console.log('\n❌ FAILED!');
        console.log('Error:', result.error);
        console.log('\nPossible reasons:');
        console.log('1. Twilio Trial accounts can only send to verified numbers.');
        console.log('2. Twilio balance is zero.');
        console.log('3. Twilio account is suspended.');
    }
}

test();

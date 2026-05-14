import twilio from 'twilio';

// Initialize Twilio client lazily when function is called
let client = null;
let initialized = false;

const initializeTwilio = () => {
    if (initialized) return;
    initialized = true;
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (accountSid && authToken) {
        client = twilio(accountSid, authToken);
    }
};

/**
 * Sends an SMS confirmation for a pool booking.
 * @param {Object} bookingDetails - Details of the booking
 * @param {string} bookingDetails.guestName - Name of the guest
 * @param {string} bookingDetails.guestPhone - Phone number to send SMS to
 * @param {string} bookingDetails.checkInTime - Check-in time
 * @param {string} bookingDetails.checkOutTime - Check-out time
 * @param {number} bookingDetails.numberOfGuests - Number of guests
 * @param {number} bookingDetails.totalAmount - Total price of the booking
 */
export const sendPoolBookingSMS = async (bookingDetails) => {
    initializeTwilio();
    
    let { 
        guestName, 
        guestPhone, 
        checkInTime, 
        checkOutTime, 
        numberOfGuests, 
        totalAmount 
    } = bookingDetails;

    // Normalize phone number (Remove non-digits and add +94)
    if (guestPhone) {
        const originalPhone = guestPhone;
        // Strip everything except digits
        let digitsOnly = guestPhone.replace(/\D/g, '');
        
        if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
            guestPhone = '+94' + digitsOnly.substring(1);
        } else if (digitsOnly.length === 9 && digitsOnly.startsWith('7')) {
            guestPhone = '+94' + digitsOnly;
        }
        console.log(`SMS Phone Normalization: ${originalPhone} -> ${guestPhone}`);
    }

    if (!client) {
        console.log('SMS simulation (Twilio not configured or initialization failed):');
        console.log(`To: ${guestPhone}`);
        console.log(`Message: Dear ${guestName}, Pool booking confirmed at Hotel Janro! Time: ${checkInTime}-${checkOutTime}, Persons: ${numberOfGuests}, Total: Rs.${totalAmount}. See you soon!`);
        return { success: true, message: 'SMS simulated (Twilio credentials missing)' };
    }

    try {
        const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
        if (!twilioNumber) {
            throw new Error('TWILIO_PHONE_NUMBER is not defined in environment variables');
        }

        console.log(`Attempting to send SMS to ${guestPhone} from ${twilioNumber}...`);

        const message = await client.messages.create({
            body: `Dear ${guestName}, Pool booking confirmed at Hotel Janro! Time: ${checkInTime}-${checkOutTime}, Persons: ${numberOfGuests}, Total: Rs.${totalAmount}. See you soon!`,
            from: twilioNumber,
            to: guestPhone
        });

        console.log(`SMS sent successfully! SID: ${message.sid}`);
        return { success: true, sid: message.sid };
    } catch (error) {
        console.error('CRITICAL: Failed to send SMS:', error.message);
        return { success: false, error: error.message };
    }
};

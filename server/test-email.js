import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

async function testEmail() {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || process.env.SMTP_HOST,
            port: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT),
            secure: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) === 465,
            auth: {
                user: process.env.EMAIL_USER || process.env.SMTP_USER,
                pass: process.env.EMAIL_PASS || process.env.SMTP_PASS
            }
        });

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to themselves to test
            subject: 'Test Email - Hotel Janro',
            text: 'This is a test email to verify SMTP configuration.'
        });

        console.log("Email sent successfully: ", info.messageId);
    } catch (err) {
        console.error("Failed to send email: ", err.message);
    }
}

testEmail();

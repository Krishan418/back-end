import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    try {
        // 1) Create a transporter
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: process.env.EMAIL_PORT === "465", // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // 2) Define the email options
        const hotelName = options.hotelName || 'Hotel Janro';
        const mailOptions = {
            from: `${hotelName} <${process.env.EMAIL_FROM}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html
        };

        // 3) Actually send the email
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("NODEMAILER ERROR:", error);
        throw error;
    }
};

export default sendEmail;

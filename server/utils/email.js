import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    try {
        const emailHost = process.env.EMAIL_HOST || process.env.SMTP_HOST;
        const emailPort = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT);
        const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
        const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
        const emailFrom = process.env.EMAIL_FROM || process.env.SMTP_FROM || emailUser;

        const smtpReady = Boolean(
            emailHost &&
            emailPort &&
            emailUser &&
            emailPass &&
            !['localhost', '127.0.0.1'].includes(String(emailHost))
        );

        if (!smtpReady) {
            return null;
        }

        // 1) Create a transporter
        const transporter = nodemailer.createTransport({
            host: emailHost,
            port: emailPort,
            secure: emailPort === 465, // true for 465, false for other ports
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });

        // 2) Define the email options
        const hotelName = options.hotelName || 'Hotel Janro';
        const mailOptions = {
            from: `${hotelName} <${emailFrom}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html,
            attachments: options.attachments
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

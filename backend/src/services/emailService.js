const nodemailer = require("nodemailer");

let transporter;

const getTransporter = () => {
    if (transporter) return transporter;
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error("SMTP chưa được cấu hình trong file .env");
    }
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || "false") === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
    if (!to) throw new Error("Email người nhận không được để trống");
    return getTransporter().sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to, subject, text, html
    });
};

const sendOtpEmail = (to, otp) => sendEmail({
    to,
    subject: "Mã xác minh đăng ký StudentJob Marketplace",
    text: `Mã OTP của bạn là ${otp}. Mã có hiệu lực trong 5 phút. Không chia sẻ mã này với người khác.`,
    html: `<p>Mã OTP đăng ký StudentJob Marketplace:</p><h2 style="letter-spacing:5px">${otp}</h2><p>Mã có hiệu lực trong 5 phút. Không chia sẻ mã này.</p>`
});

module.exports = { sendEmail, sendOtpEmail };

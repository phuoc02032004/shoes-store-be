// utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Tạo transporter (Đối tượng sẽ gửi email)
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        // secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports like 587
        // tls: { // Bỏ comment nếu cần cấu hình cụ thể cho TLS/SSL
        //     // do not fail on invalid certs
        //     rejectUnauthorized: false
        // },
    });

    // 2. Định nghĩa các tùy chọn email
    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`, // Tên và địa chỉ người gửi
        to: options.email, // Địa chỉ người nhận
        subject: options.subject, // Chủ đề email
        text: options.message, // Nội dung dạng text
        html: options.html // Nội dung dạng HTML (tùy chọn, ưu tiên hơn text nếu có)
    };

    // 3. Thực hiện gửi email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Gửi email thất bại'); // Ném lỗi để controller có thể bắt
    }
};

module.exports = sendEmail;
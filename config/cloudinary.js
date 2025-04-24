// config/cloudinary.js
const cloudinary = require('cloudinary').v2; // Import v2
const dotenv = require('dotenv');

dotenv.config(); // Đảm bảo biến môi trường được load

// Cấu hình Cloudinary SDK bằng biến môi trường
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Sử dụng HTTPS
});

console.log('Cloudinary Configured:', cloudinary.config().cloud_name ? 'OK' : 'Failed - Check .env');

module.exports = cloudinary;
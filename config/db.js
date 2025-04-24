// config/db.js
const mongoose = require('mongoose');
require('dotenv').config(); // Đảm bảo biến môi trường được load

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useCreateIndex: true, // Không còn cần thiết từ Mongoose 6
      // useFindAndModify: false // Không còn cần thiết từ Mongoose 6
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Thoát khỏi tiến trình nếu không kết nối được DB
  }
};

module.exports = connectDB;
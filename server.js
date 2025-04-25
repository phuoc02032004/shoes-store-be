// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');
const sizeRoutes = require('./routes/sizeRoutes'); 
const categoryRoutes = require('./routes/categoryRoutes');
const zalopayRoutes = require('./routes/zalopayRoutes');
const path = require('path');


// --- Swagger Imports ---
const swaggerUi = require('swagger-ui-express');
// --- End Swagger Imports ---
const swaggerSpec = require('./config/swaggerConfig');
dotenv.config();
connectDB();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser()); // Uncomment nếu dùng cookie

// --- End Swagger Definition ---

// Route cơ bản
app.get('/', (req, res) => {
  res.send('Shoe Store API is running...');
});

// Đường dẫn tới swagger.json
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// --- Swagger UI Route ---
// Cấu hình Swagger UI options
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    url: '/api-docs/swagger.json',
  },
};

// Phục vụ giao diện Swagger UI tại /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
// --- End Swagger UI Route ---


// Mount Routes (đặt SAU Swagger UI route nếu bạn muốn /api-docs không bị các route khác bắt)
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/sizes', sizeRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/zalopay', zalopayRoutes);

// Middleware xử lý lỗi
app.use((req, res, next) => {
    // Chỉ gửi lỗi 404 nếu không phải request tới /api-docs
    if (!req.originalUrl.startsWith('/api-docs')) {
       res.status(404).json({ success: false, message: `API endpoint not found: ${req.originalUrl}` });
    } else {
        next(); // Cho phép request /api-docs đi tiếp (quan trọng)
    }
});

app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  // In ra đường dẫn tới Swagger UI khi server khởi động
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});

process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware bảo vệ route, yêu cầu đăng nhập (có token hợp lệ)
const protect = async (req, res, next) => {
    let token;

    // Kiểm tra xem token có trong header Authorization không (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // Lấy token từ header (Bỏ phần 'Bearer ')
        token = req.headers.authorization.split(' ')[1];
    }
    // Hoặc kiểm tra xem token có trong cookie không (nếu bạn dùng cookie)
    // else if (req.cookies.token) {
    //     token = req.cookies.token;
    // }

    // Đảm bảo token tồn tại
    if (!token) {
        return res.status(401).json({ success: false, message: 'Từ chối truy cập, không có token' }); // 401 Unauthorized
    }

    try {
        // Xác minh token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Tìm user dựa trên ID trong token và gắn vào request để các route sau có thể sử dụng
        // Không lấy password
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
             return res.status(401).json({ success: false, message: 'Người dùng không tồn tại' });
        }

        next(); // Chuyển sang middleware/controller tiếp theo
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        // Xử lý các lỗi JWT cụ thể
        if (error.name === 'JsonWebTokenError') {
             return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token đã hết hạn' });
        }
        return res.status(401).json({ success: false, message: 'Từ chối truy cập' });
    }
};

// Middleware phân quyền dựa trên vai trò (role)
// Ví dụ: authorize('admin') -> chỉ admin được truy cập
// Ví dụ: authorize('admin', 'user') -> cả admin và user đều được truy cập
const authorize = (...roles) => {
    return (req, res, next) => {
        // Middleware protect phải chạy trước để có req.user
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Cần đăng nhập để thực hiện hành động này' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Người dùng với vai trò '${req.user.role}' không được phép truy cập route này`,
            }); // 403 Forbidden
        }
        next();
    };
};


module.exports = { protect, authorize };
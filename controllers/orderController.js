// controllers/orderController.js
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const mongoose = require('mongoose'); // Cần cho session (transaction) nếu dùng
const User = require('../models/User');

// @desc    Tạo đơn hàng mới từ giỏ hàng
// @route   POST /api/orders
// @access  Private (User logged in)
exports.createOrder = async (req, res, next) => {
    const { shippingAddress, paymentMethod } = req.body;
    const userId = req.user.id; // Lấy từ middleware 'protect'

    // --- Validate Input ---
    if (!shippingAddress || !paymentMethod) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp địa chỉ giao hàng và phương thức thanh toán.' });
    }
    // Thêm validation chi tiết cho shippingAddress nếu cần

    try {
        console.log(`[CreateOrder] Processing order for user: ${userId}`);

        // 1. Lấy giỏ hàng của người dùng
        const cart = await Cart.findOne({ user: userId }).populate({
            path: 'items.product',
            select: 'name image price stock isOnSale discount discountedPrice sizes category brand material'
        });
        if (!cart || cart.items.length === 0) {
            console.log(`[CreateOrder] Cart is empty for user: ${userId}`);
            return res.status(400).json({ success: false, message: 'Giỏ hàng của bạn đang trống.' });
        }

        // 2. Calculate order total from cart items
        let itemsPrice = 0;
        for (const item of cart.items) {
            itemsPrice += item.product.discountedPrice * item.quantity;
        }
        const shippingPrice = itemsPrice > 500000 ? 0 : 30000;
        const taxPrice = 0;
        const totalPrice = itemsPrice + shippingPrice + taxPrice;

        // 3. Create order items array
        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            name: item.product.name,
            image: item.product.image,
            price: item.product.discountedPrice,
            quantity: item.quantity,
            size: item.size
        }));

        // 4. Create order
        const order = new Order({
            user: userId,
            orderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            shippingPrice,
            taxPrice,
            totalPrice
        });

        const createdOrder = await order.save();
        console.log(`[CreateOrder] Order created successfully: ${createdOrder._id}`);

        // 5. Clear the cart
        await Cart.deleteOne({ user: userId });
        console.log(`[CreateOrder] Cart cleared for user: ${userId}`);

        // 6. Return response based on payment method
        let paymentResponse = null;

        if (paymentMethod === 'ZaloPay') {
            // For ZaloPay payments, inform the client that the order is created
            // but they need to use the ZaloPay API separately
            paymentResponse = { 
                message: 'Đơn hàng đã được tạo. Vui lòng sử dụng API /api/zalopay/create/:orderId để tạo thanh toán.'
            };
        } else {
            // For other payment methods (COD, etc.)
            paymentResponse = { message: `Order created with ${paymentMethod}.` };
        }

        // Return the created order details
        res.status(201).json({ success: true, data: { order: createdOrder, cartItems: cart.items, payment: paymentResponse } });

    } catch (error) {
        console.error("[CreateOrder] Error creating order:", error.message);
        // Trả lỗi về client
        // Ensure only one response is sent
        if (!res.headersSent) {
            res.status(error.message.includes('không đủ số lượng') ? 400 : 500) // Lỗi 400 nếu do hết hàng
                .json({ success: false, message: error.message || 'Lỗi Server khi tạo đơn hàng.' });
        } else {
            console.error("[CreateOrder] Headers already sent, cannot send error response.");
        }
    }
};

// @desc    Lấy danh sách đơn hàng của người dùng đang đăng nhập
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res, next) => {
    const userId = req.user.id;
    try {
        console.log(`[GetMyOrders] Fetching orders for user: ${userId}`);
        // Sắp xếp theo mới nhất
        const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        console.error(`[GetMyOrders] Error fetching orders for user ${userId}:`, error);
        res.status(500).json({ success: false, message: 'Lỗi Server khi lấy danh sách đơn hàng.' });
    }
};

// @desc    Lấy chi tiết một đơn hàng
// @route   GET /api/orders/:id
// @access  Private (User xem đơn của mình, Admin xem mọi đơn)
exports.getOrderById = async (req, res, next) => {
    const orderId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        console.log(`[GetOrderById] Fetching order: ${orderId} for user: ${userId}`);
        // Populate thông tin user (chỉ lấy name, email) và thông tin sp trong items
        const order = await Order.findById(orderId)
            .populate('user', 'name email')
        // .populate('orderItems.product', 'name image'); // Populate nếu cần info mới nhất (nhưng thường đã lưu trong orderItem)

        if (!order) {
            console.log(`[GetOrderById] Order not found: ${orderId}`);
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }

        // --- Kiểm tra quyền truy cập ---
        // Admin có thể xem mọi đơn hàng
        // User chỉ có thể xem đơn hàng của chính mình
        if (userRole !== 'admin' && order.user._id.toString() !== userId.toString()) {
            console.warn(`[GetOrderById] Forbidden access attempt: User ${userId} tried to access order ${orderId} owned by ${order.user._id}`);
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xem đơn hàng này.' });
        }

        res.status(200).json({ success: true, data: order });

    } catch (error) {
        console.error(`[GetOrderById] Error fetching order ${orderId}:`, error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: 'ID đơn hàng không hợp lệ.' });
        }
        res.status(500).json({ success: false, message: 'Lỗi Server khi lấy chi tiết đơn hàng.' });
    }
};

// @desc    Lấy tất cả đơn hàng (Admin)
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res, next) => {
    try {
        // Thêm logic phân trang, lọc, sắp xếp tương tự getAllProducts nếu cần
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        // Thêm filter theo status, isPaid, isDelivered...
        const filter = {};
        if (req.query.status) filter.orderStatus = req.query.status;
        if (req.query.isPaid) filter.isPaid = req.query.isPaid === 'true';
        // ...

        console.log('[GetAllOrders] Fetching all orders (Admin)');
        const orders = await Order.find(filter)
            .populate('user', 'name email') // Lấy thông tin người dùng
            .sort({ createdAt: -1 })       // Sắp xếp mới nhất
            .skip(skip)
            .limit(limit);

        const totalOrders = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limit);

        res.status(200).json({
            success: true,
            count: orders.length,
            pagination: { totalOrders, totalPages, currentPage: page, limit },
            data: orders
        });
    } catch (error) {
        console.error("[GetAllOrders] Server Error:", error);
        res.status(500).json({ success: false, message: 'Lỗi Server khi lấy danh sách đơn hàng.' });
    }
};

// @desc    Cập nhật trạng thái đơn hàng thành Đã thanh toán (Admin)
// @route   PUT /api/orders/:id/pay
// @access  Private/Admin
exports.updateOrderToPaid = async (req, res, next) => {
    const orderId = req.params.id;
    // Lấy thông tin thanh toán từ body (ví dụ: từ callback của cổng thanh toán hoặc admin nhập)
    const { paymentId, status, update_time, email_address } = req.body;

    try {
        console.log(`[UpdateOrderToPaid] Attempting to mark order ${orderId} as paid`);
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }

        if (order.isPaid) {
            return res.status(400).json({ success: false, message: 'Đơn hàng này đã được thanh toán trước đó.' });
        }

        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = { // Lưu thông tin thanh toán nếu có
            id: paymentId || orderId, // Dùng ID đơn hàng nếu không có ID giao dịch riêng
            status: status || 'COMPLETED', // Mặc định hoặc lấy từ input
            update_time: update_time || new Date().toISOString(),
            email_address: email_address || order.shippingAddress.email, // Lấy email từ địa chỉ ship nếu có
        };
        // Cập nhật trạng thái đơn hàng nếu cần (ví dụ: từ Pending -> Processing)
        if (order.orderStatus === 'Pending') {
            order.orderStatus = 'Processing';
        }

        const updatedOrder = await order.save();
        console.log(`[UpdateOrderToPaid] Order ${orderId} marked as paid successfully.`);
        res.status(200).json({ success: true, data: updatedOrder });

    } catch (error) {
        console.error(`[UpdateOrderToPaid] Error updating order ${orderId} to paid:`, error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: 'ID đơn hàng không hợp lệ.' });
        }
        res.status(500).json({ success: false, message: 'Lỗi Server khi cập nhật trạng thái thanh toán.' });
    }
};

// @desc    Cập nhật trạng thái đơn hàng thành Đã giao hàng (Admin)
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
exports.updateOrderToDelivered = async (req, res, next) => {
    const orderId = req.params.id;

    try {
        console.log(`[UpdateOrderToDelivered] Attempting to mark order ${orderId} as delivered`);
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }

        // Tùy chọn: Kiểm tra xem đơn hàng đã thanh toán chưa trước khi giao
        // if (!order.isPaid && order.paymentMethod !== 'COD') {
        //     return res.status(400).json({ success: false, message: 'Không thể đánh dấu giao hàng cho đơn chưa thanh toán (trừ COD).' });
        // }

        if (order.isDelivered) {
            return res.status(400).json({ success: false, message: 'Đơn hàng này đã được giao trước đó.' });
        }

        order.isDelivered = true;
        order.deliveredAt = Date.now();
        order.orderStatus = 'Delivered'; // Cập nhật trạng thái cuối cùng

        const updatedOrder = await order.save();
        console.log(`[UpdateOrderToDelivered] Order ${orderId} marked as delivered successfully.`);
        res.status(200).json({ success: true, data: updatedOrder });

    } catch (error) {
        console.error(`[UpdateOrderToDelivered] Error updating order ${orderId} to delivered:`, error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: 'ID đơn hàng không hợp lệ.' });
        }
        res.status(500).json({ success: false, message: 'Lỗi Server khi cập nhật trạng thái giao hàng.' });
    }
};

// @desc    Lấy số lượng đơn hàng theo trạng thái (Admin Dashboard)
// @route   GET /api/orders/status-counts
// @access  Private/Admin
exports.getOrderStatusCounts = async (req, res, next) => {
    try {
        console.log('[GetOrderStatusCounts] Fetching order status counts (Admin)');
        const statusCounts = await Order.aggregate([
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    status: '$_id',
                    count: 1
                }
            }
        ]);

        res.status(200).json({ success: true, data: statusCounts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Server khi lấy thống kê trạng thái đơn hàng.' });
    }
};
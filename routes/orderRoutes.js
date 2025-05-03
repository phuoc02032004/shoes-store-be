const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderToPaid,
  updateOrderToDelivered,
  getOrderStatusCounts
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Quản lý đơn hàng
 */

// Tạo đơn hàng mới
/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Tạo đơn hàng mới
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shippingAddress, paymentMethod]
 *             properties:
 *               shippingAddress:
 *                 $ref: '#/components/schemas/ShippingAddress'
 *               paymentMethod:
 *                 type: string
 *                 enum: [COD, Card, PayPal, Momo, VNPay, ZaloPay]
 *     responses:
 *       201:
 *         description: Đơn hàng được tạo thành công
 *       400:
 *         description: |
 *           Thiếu thông tin hoặc giỏ hàng trống.
 *           Ví dụ lỗi validation:
 *           ```json
 *           {
 *             "success": false,
 *             "message": "Order validation failed: shippingAddress.phone: Vui lòng nhập số điện thoại, shippingAddress.address1: Vui lòng nhập địa chỉ chi tiết, shippingAddress.fullName: Vui lòng nhập họ tên người nhận"
 *           }
 *           ```
 *       401:
 *         description: Không xác thực
 *       500:
 *         description: Lỗi server
 */
router.post('/', protect, createOrder);

// Lấy tất cả đơn hàng (Admin)
/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Lấy danh sách tất cả đơn hàng (Chỉ Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Processing, Shipped, Delivered, Cancelled, Failed]
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/', protect, authorize('admin'), getAllOrders);

// Lấy đơn hàng của chính người dùng
/**
 * @swagger
 * /orders/myorders:
 *   get:
 *     summary: Lấy danh sách đơn hàng của người dùng đang đăng nhập
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng
 *       401:
 *         description: Không xác thực
 */
router.get('/myorders', protect, getMyOrders);

/**
 * @swagger
 * /api/orders/status-counts:
 *   get:
 *     summary: Lấy số lượng đơn hàng theo trạng thái (Admin Dashboard)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê đơn hàng theo trạng thái
 *       401:
 *         description: Không xác thực
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/status-counts', protect, authorize('admin'), getOrderStatusCounts);

// Lấy đơn hàng theo ID
/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Lấy chi tiết đơn hàng theo ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Chi tiết đơn hàng
 *       401:
 *         description: Không xác thực
 *       403:
 *         description: Không có quyền xem đơn hàng
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.get('/:id', protect, getOrderById);

// Cập nhật trạng thái thanh toán
/**
 * @swagger
 * /api/orders/{id}/pay:
 *   put:
 *     summary: Đánh dấu đơn hàng đã thanh toán
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentResult'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền
 */
router.put('/:id/pay', protect, authorize('admin'), updateOrderToPaid);

// Cập nhật trạng thái giao hàng
/**
 * @swagger
 * /api/orders/{id}/deliver:
 *   put:
 *     summary: Đánh dấu đơn hàng đã giao hàng
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền
 */
router.put('/:id/deliver', protect, authorize('admin'), updateOrderToDelivered);

module.exports = router;


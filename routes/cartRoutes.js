// routes/cartRoutes.js
const express = require('express');
const {
    getCart,
    addItemToCart,
    updateCartItemQuantity,
    removeItemFromCart,
    clearCart
} = require('../controllers/cartController'); // Import controllers

const { protect } = require('../middleware/authMiddleware'); // Chỉ user đăng nhập mới có giỏ hàng

const router = express.Router();

// --- Swagger Tag ---
/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Quản lý Giỏ hàng người dùng
 */

// --- Routes ---

// Lấy giỏ hàng hiện tại và Xóa toàn bộ giỏ hàng
router.route('/')
    /**
     * @swagger
     * /cart:
     *   get:
     *     summary: Lấy giỏ hàng của người dùng đang đăng nhập
     *     tags: [Cart]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Thông tin giỏ hàng (đã populate sản phẩm).
     *         content: { application/json: { schema: { type: object, properties: { success: {type: boolean}, data: { $ref: '#/components/schemas/Cart' } } } } } # Cần schema Cart
     *       401: { description: "Chưa đăng nhập", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     *       500: { description: "Lỗi Server", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     */
    .get(protect, getCart) // Bảo vệ route
    /**
     * @swagger
     * /cart:
     *   delete:
     *     summary: Xóa toàn bộ sản phẩm trong giỏ hàng
     *     tags: [Cart]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Xóa giỏ hàng thành công.
     *         content: { application/json: { schema: { type: object, properties: { success: {type: boolean}, message: {type: string}, data: { $ref: '#/components/schemas/Cart' } } } } }
     *       401: { description: "Chưa đăng nhập", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     *       500: { description: "Lỗi Server", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     */
    .delete(protect, clearCart); // Bảo vệ route

// Thêm sản phẩm vào giỏ hàng
router.route('/items')
    /**
     * @swagger
     * /cart/items:
     *   post:
     *     summary: Thêm sản phẩm vào giỏ hàng hoặc cập nhật số lượng
     *     tags: [Cart]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [productId, quantity, sizeId]
     *             properties:
     *               productId: { type: string, description: "ID của sản phẩm", example: "605c72ef3e9f5a2c74f5b3a4" }
     *               quantity: { type: integer, description: "Số lượng muốn thêm", minimum: 1, example: 1 }
     *               sizeId: { type: string, description: "ID size sản phẩm muốn thêm", example: "654babcf369a1d541b0bb1a0" }
     *     responses:
     *       200:
     *         description: Thêm/Cập nhật thành công. Trả về giỏ hàng mới.
     *         content: { application/json: { schema: { type: object, properties: { success: {type: boolean}, message: {type: string}, data: { $ref: '#/components/schemas/Cart' } } } } }
     *       400: { description: "Dữ liệu không hợp lệ / Hết hàng / Size không hợp lệ", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     *       401: { description: "Chưa đăng nhập", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     *       404: { description: "Sản phẩm không tồn tại", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     *       500: { description: "Lỗi Server", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     */
    .post(protect, addItemToCart); // Bảo vệ route

// Cập nhật số lượng hoặc Xóa một item cụ thể trong giỏ hàng
// Sử dụng params trong URL để xác định item cần thao tác
router.route('/items/:productId/:sizeId') // Changed size to sizeId
    /**
     * @swagger
     * /cart/items/{productId}/{sizeId}:  # Changed size to sizeId
     *   put:
     *     summary: Cập nhật số lượng của một sản phẩm trong giỏ hàng
     *     tags: [Cart]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: productId
     *         required: true
     *         schema: { type: string }
     *         description: ID của sản phẩm cần cập nhật
     *       - in: path
     *         name: sizeId  # Changed size to sizeId
     *         required: true
     *         schema: { type: string }
     *         description: Size của sản phẩm cần cập nhật
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [quantity]
     *             properties:
     *               quantity: { type: integer, description: "Số lượng mới", minimum: 1, example: 3 }
     *     responses:
     *       200: { description: "Cập nhật thành công.", content: { application/json: { schema: { type: object, properties: { success: {type: boolean}, message: {type: string}, data: { $ref: '#/components/schemas/Cart' } } } } } }
     *       400: { description: "Dữ liệu không hợp lệ / Hết hàng", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     *       401: { description: "Chưa đăng nhập", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     *       404: { description: "Giỏ hàng hoặc Item không tồn tại", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     *       500: { description: "Lỗi Server", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     */
    .put(protect, updateCartItemQuantity) // Bảo vệ route
    /**
     * @swagger
     * /cart/items/{productId}/{sizeId}: # Changed size to sizeId
     *   delete:
     *     summary: Xóa một sản phẩm (với size cụ thể) khỏi giỏ hàng
     *     tags: [Cart]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: productId
     *         required: true
     *         schema: { type: string }
     *         description: ID của sản phẩm cần xóa
     *       - in: path
     *         name: sizeId # Changed size to sizeId
     *         required: true
     *         schema: { type: string }
     *         description: Size của sản phẩm cần xóa
     *     responses:
     *       200: { description: "Xóa thành công.", content: { application/json: { schema: { type: object, properties: { success: {type: boolean}, message: {type: string}, data: { $ref: '#/components/schemas/Cart' } } } } } }
     *       401: { description: "Chưa đăng nhập", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     *       404: { description: "Giỏ hàng hoặc Item không tồn tại", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     *       500: { description: "Lỗi Server", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
     */
    .delete(protect, removeItemFromCart); // Bảo vệ route


module.exports = router;
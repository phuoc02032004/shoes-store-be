const express = require('express');
const router = express.Router();
const { 
    createPayment,
    handleCallback,
    checkPaymentStatus
} = require('../controllers/zalopayController');
const { protect } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: ZaloPay
 *   description: Quản lý thanh toán qua ZaloPay
 */

/**
 * @swagger
 * /zalopay/create/{orderId}:
 *   post:
 *     summary: Tạo yêu cầu thanh toán ZaloPay cho đơn hàng
 *     tags: [ZaloPay]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn hàng cần thanh toán
 *     responses:
 *       200:
 *         description: Yêu cầu thanh toán tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     order:
 *                       type: string
 *                       example: "615a9c587c213e001c123a45"
 *                     payUrl:
 *                       type: string
 *                       example: "https://sbpayment.zalopay.vn/v2/payment/..."
 *                     appTransId:
 *                       type: string
 *                       example: "220415_123456_abcdef"
 *                     zpTransId:
 *                       type: string
 *                       example: "220415000001"
 *       400:
 *         description: Lỗi tạo thanh toán
 *       403:
 *         description: Không có quyền thanh toán đơn hàng này
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.post('/create/:orderId', protect, createPayment);

/**
 * @swagger
 * /zalopay/callback:
 *   post:
 *     summary: Callback URL cho ZaloPay gửi thông báo kết quả thanh toán
 *     description: Endpoint này được ZaloPay gọi khi có kết quả giao dịch. Không truy cập trực tiếp.
 *     tags: [ZaloPay]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               app_id:
 *                 type: string
 *               app_trans_id:
 *                 type: string
 *               app_time:
 *                 type: number
 *               amount:
 *                 type: number
 *               embed_data:
 *                 type: string
 *               item:
 *                 type: string
 *               zp_trans_id:
 *                 type: string
 *               server_time:
 *                 type: number
 *               status:
 *                 type: number
 *               mac:
 *                 type: string
 *     responses:
 *       200:
 *         description: Response to ZaloPay server
 */
router.post('/callback', handleCallback);

/**
 * @swagger
 * /zalopay/status/{transId}:
 *   get:
 *     summary: Kiểm tra trạng thái thanh toán ZaloPay
 *     tags: [ZaloPay]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: transId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID giao dịch ZaloPay (app_trans_id)
 *     responses:
 *       200:
 *         description: Thông tin trạng thái thanh toán
 *       400:
 *         description: Thiếu mã giao dịch
 *       403:
 *         description: Không có quyền kiểm tra đơn hàng này
 *       404:
 *         description: Không tìm thấy đơn hàng với mã giao dịch này
 */
router.get('/status/:transId', protect, checkPaymentStatus);

module.exports = router; 
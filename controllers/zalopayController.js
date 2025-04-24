// Node v10.15.3
const axios = require('axios').default; // npm install axios
const CryptoJS = require('crypto-js'); // npm install crypto-js
const moment = require('moment'); // npm install moment
const Order = require('../models/Order');
const zalopayUtils = require('../utils/zalopayUtils');

// APP INFO
const config = {
    app_id: "2553",
    key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
    key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
    endpoint: "https://sb-openapi.zalopay.vn/v2/create"
};

const embed_data = {};

const items = [{}];
const transID = Math.floor(Math.random() * 1000000);
const order = {
    app_id: config.app_id,
    app_trans_id: `${moment().format('YYMMDD')}_${transID}`, // translation missing: vi.docs.shared.sample_code.comments.app_trans_id
    app_user: "user123",
    app_time: Date.now(), // miliseconds
    item: JSON.stringify(items),
    embed_data: JSON.stringify(embed_data),
    amount: 50000,
    description: `Lazada - Payment for the order #${transID}`,
    bank_code: "zalopayapp",
};

// appid|app_trans_id|appuser|amount|apptime|embeddata|item
const data = config.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" + order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;
order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

axios.post(config.endpoint, null, { params: order })
    .then(res => {
        console.log(res.data);
    })
    .catch(err => console.log(err));

/**
 * @desc    Create ZaloPay payment for an order
 * @route   POST /api/zalopay/create/:orderId
 * @access  Private
 */
exports.createPayment = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        
        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }
        
        // Verify user has permission to pay for this order
        if (req.user.role !== 'admin' && order.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền thực hiện thanh toán cho đơn hàng này'
            });
        }
        
        // Check if order is already paid
        if (order.isPaid) {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng này đã được thanh toán'
            });
        }
        
        // Format order items for ZaloPay
        const zalopayItems = order.orderItems.map(item => ({
            itemid: item.product.toString(),
            itemname: item.name,
            itemprice: Math.round(item.price),
            itemquantity: item.quantity
        }));
        
        // Create ZaloPay payment
        const zalopayData = await zalopayUtils.createAndSendPaymentRequest(
            Math.round(order.totalPrice),
            order._id.toString(),
            `Thanh toán đơn hàng #${order._id}`,
            zalopayItems
        );
        
        if (zalopayData && zalopayData.return_code === 1) {
            // Update order with ZaloPay transaction info
            order.paymentMethod = 'ZaloPay'; // Set payment method if not already set
            order.paymentResult = {
                id: zalopayData.zp_trans_id || '',
                status: 'PENDING',
                update_time: new Date().toISOString(),
                app_trans_id: zalopayData.app_trans_id || '',
                order_url: zalopayData.order_url || ''
            };
            await order.save();
            
            // Return success response with payment URL
            return res.status(200).json({
                success: true,
                data: {
                    order: order._id,
                    payUrl: zalopayData.order_url,
                    appTransId: zalopayData.app_trans_id,
                    zpTransId: zalopayData.zp_trans_id
                }
            });
        } else {
            return res.status(400).json({
                success: false,
                message: zalopayData.return_message || 'Không thể tạo thanh toán ZaloPay'
            });
        }
    } catch (error) {
        console.error("[ZaloPay] Create payment error:", error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi Server khi tạo thanh toán ZaloPay: ' + error.message
        });
    }
};

/**
 * @desc    Process callback from ZaloPay
 * @route   POST /api/zalopay/callback
 * @access  Public
 */
exports.handleCallback = async (req, res) => {
    try {
        console.log("[ZaloPayCallback] Received callback from ZaloPay:", JSON.stringify(req.body));
        
        // Extract data from callback
        const { app_trans_id, zp_trans_id, app_id, app_time, amount, embed_data, item, status, server_time, mac } = req.body;
        
        // Verify the callback with MAC
        const isValidCallback = zalopayUtils.verifyCallback(req.body, mac);
        
        if (!isValidCallback) {
            console.error("[ZaloPayCallback] Invalid MAC - possible security issue");
            return res.status(200).json({ 
                return_code: 3, 
                return_message: "invalid signature" 
            });
        }
        
        // Find the order using app_trans_id (which contains our order ID)
        // Extract orderId from app_trans_id (based on how we formatted it)
        const appTransIdParts = app_trans_id.split('_');
        let orderId = null;
        
        if (appTransIdParts.length >= 3) {
            // If we're using the format YYMMDD_randomID_orderIdPart
            // Try to reconstruct or query by a partial match
            const partialOrderId = appTransIdParts[2];
            // This approach depends on your app_trans_id format
            const orders = await Order.find({
                _id: { $regex: partialOrderId + '$' } // Match IDs ending with this pattern
            });
            
            if (orders.length === 1) {
                orderId = orders[0]._id;
            } else {
                console.error(`[ZaloPayCallback] Cannot uniquely identify order from app_trans_id: ${app_trans_id}`);
            }
        }
        
        if (!orderId) {
            return res.status(200).json({ 
                return_code: 2, 
                return_message: "Cannot identify order" 
            });
        }
        
        const order = await Order.findById(orderId);
        
        if (!order) {
            console.error(`[ZaloPayCallback] Order not found for ID: ${orderId}`);
            return res.status(200).json({ 
                return_code: 2, 
                return_message: "Order not found" 
            });
        }
        
        // Update order based on ZaloPay status
        if (status === 1) { // Success
            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentResult = {
                id: zp_trans_id,
                status: 'COMPLETED',
                update_time: new Date(server_time).toISOString(),
                app_trans_id: app_trans_id,
                zp_trans_id: zp_trans_id
            };
            
            // Update order status
            if (order.orderStatus === 'Pending') {
                order.orderStatus = 'Processing';
            }
            
            await order.save();
            console.log(`[ZaloPayCallback] Order ${orderId} marked as paid successfully.`);
        } else {
            // Payment failed or other status
            order.paymentResult = {
                id: zp_trans_id,
                status: 'FAILED',
                update_time: new Date(server_time).toISOString(),
                app_trans_id: app_trans_id,
                zp_trans_id: zp_trans_id
            };
            await order.save();
            console.log(`[ZaloPayCallback] Order ${orderId} payment failed with status: ${status}`);
        }
        
        // Return success response to ZaloPay (required by their API)
        return res.status(200).json({ 
            return_code: 1, 
            return_message: "success" 
        });
        
    } catch (error) {
        console.error("[ZaloPayCallback] Error processing ZaloPay callback:", error);
        // Always return a success response to ZaloPay to prevent them from retrying
        return res.status(200).json({ 
            return_code: 1, 
            return_message: "success" 
        });
    }
};

/**
 * @desc    Check payment status with ZaloPay
 * @route   GET /api/zalopay/status/:transId
 * @access  Private
 */
exports.checkPaymentStatus = async (req, res) => {
    try {
        const transId = req.params.transId;
        
        if (!transId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu mã giao dịch'
            });
        }
        
        // Query payment status from ZaloPay
        const statusResponse = await zalopayUtils.checkPaymentStatus(transId);
        
        // Find the order by app_trans_id
        const order = await Order.findOne({
            'paymentResult.app_trans_id': transId
        });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng với mã giao dịch này'
            });
        }
        
        // Verify user has permission to check this order
        if (req.user.role !== 'admin' && order.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền kiểm tra đơn hàng này'
            });
        }
        
        // If ZaloPay shows payment is successful but our order isn't marked as paid, update it
        if (statusResponse.return_code === 1 && statusResponse.return_message === 'SUCCESS' && !order.isPaid) {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentResult.status = 'COMPLETED';
            order.paymentResult.update_time = new Date().toISOString();
            
            // Update order status if needed
            if (order.orderStatus === 'Pending') {
                order.orderStatus = 'Processing';
            }
            
            await order.save();
            console.log(`[ZaloPay] Order ${order._id} marked as paid after status check`);
        }
        
        return res.status(200).json({
            success: true,
            data: {
                orderId: order._id,
                totalAmount: order.totalPrice,
                isPaid: order.isPaid,
                orderStatus: order.orderStatus,
                paymentStatus: statusResponse
            }
        });
        
    } catch (error) {
        console.error("[ZaloPay] Error checking payment status:", error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi Server khi kiểm tra trạng thái thanh toán: ' + error.message
        });
    }
};
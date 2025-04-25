const axios = require('axios');
const CryptoJS = require('crypto-js');
const moment = require('moment');

// ZaloPay API Config (use environment variables)
const config = {
    app_id: process.env.ZALOPAY_APP_ID || "2553",
    key1: process.env.ZALOPAY_KEY1 || "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
    key2: process.env.ZALOPAY_KEY2 || "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
    create_order_endpoint: process.env.ZALOPAY_CREATE_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/create",
    query_order_endpoint: process.env.ZALOPAY_QUERY_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/query"
};

/**
 * Create and send a payment request to ZaloPay
 * @param {Number} amount - Order amount (integer)
 * @param {String} orderId - Order ID from your system
 * @param {String} description - Order description
 * @param {Array} items - Array of order items (optional)
 * @returns {Promise} - ZaloPay API response
 */
const createAndSendPaymentRequest = async (amount, orderId, description, items = []) => {
    try {
        // Generate a unique app_trans_id
        const transID = Math.floor(Math.random() * 1000000);
        const appTransId = `${moment().format('YYMMDD')}_${transID}_${orderId.slice(-6)}`;
        
        // Prepare order data
        const embed_data = {
            redirecturl: process.env.FRONTEND_URL + '/payment-result'
        };
        
        const order = {
            app_id: config.app_id,
            app_trans_id: appTransId,
            app_user: "user", // Can be the actual user ID if needed
            app_time: Date.now(), // milliseconds
            item: JSON.stringify(items),
            embed_data: JSON.stringify(embed_data),
            amount: amount,
            description: description || `Thanh toán đơn hàng #${orderId}`,
            callback_url: `${process.env.API_URL}/api/orders/zalopay-callback` // URL to receive payment notifications
        };

        // Generate MAC (Message Authentication Code)
        const data = config.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" + 
                     order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;
        order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

        console.log(`[ZaloPay] Creating payment request for order: ${orderId}, amount: ${amount}`);
        
        // Send request to ZaloPay API
        const response = await axios.post(config.create_order_endpoint, null, { params: order });
        
        console.log(`[ZaloPay] Payment request response:`, response.data);
        return response.data;
    } catch (error) {
        console.error('[ZaloPay] Create Payment Error:', error.response?.data || error.message);
        throw new Error('Failed to create ZaloPay payment: ' + (error.response?.data?.return_message || error.message));
    }
};

/**
 * Check payment status with ZaloPay
 * @param {String} appTransId - app_trans_id used in payment creation
 * @returns {Promise} - ZaloPay query API response
 */
const checkPaymentStatus = async (appTransId) => {
    try {
        const params = {
            app_id: config.app_id,
            app_trans_id: appTransId
        };
        
        // Generate MAC for query
        const data = config.app_id + "|" + params.app_trans_id + "|" + config.key1;
        params.mac = CryptoJS.HmacSHA256(data, config.key1).toString();
        
        console.log(`[ZaloPay] Checking payment status for transaction: ${appTransId}`);
        
        const response = await axios.post(config.query_order_endpoint, null, { params });
        console.log(`[ZaloPay] Payment status response:`, response.data);
        
        return response.data;
    } catch (error) {
        console.error('[ZaloPay] Query Payment Error:', error.response?.data || error.message);
        throw new Error('Failed to query ZaloPay payment: ' + (error.response?.data?.return_message || error.message));
    }
};

/**
 * Verify callback data from ZaloPay
 * @param {Object} data - Callback data from ZaloPay
 * @param {String} requestMac - MAC sent by ZaloPay
 * @returns {Boolean} - Whether the callback is valid
 */
const verifyCallback = (data, requestMac) => {
    try {
        // Extract necessary fields and create data string according to ZaloPay docs
        let dataStr = "";
        
        // The data string order should follow ZaloPay's documentation
        // This is a simplified example - adjust according to ZaloPay's actual requirements
        if (data.app_id && data.app_trans_id && data.amount) {
            dataStr = data.app_id + "|" + data.app_trans_id + "|" + data.amount;
        }
        
        // Generate MAC for verification
        const calculatedMac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
        
        console.log(`[ZaloPay] Verifying callback - Received MAC: ${requestMac}, Calculated MAC: ${calculatedMac}`);
        
        return calculatedMac === requestMac;
    } catch (error) {
        console.error('[ZaloPay] Callback verification error:', error);
        return false;
    }
};

module.exports = {
    createAndSendPaymentRequest,
    checkPaymentStatus,
    verifyCallback,
    config
}; 
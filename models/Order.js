// models/Order.js
const mongoose = require('mongoose');

// --- Sub-schema cho Item trong Đơn hàng ---
const orderItemSchema = new mongoose.Schema({
  product: { // Tham chiếu đến sản phẩm đã mua
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: { // Lưu lại tên SP tại thời điểm mua
    type: String,
    required: true,
  },
  image: { // Lưu lại ảnh SP tại thời điểm mua
    type: String,
    required: true,
  },
  price: { // Lưu lại giá SP tại thời điểm mua (giá cuối cùng sau chiết khấu nếu có)
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Số lượng sản phẩm phải ít nhất là 1'],
    default: 1,
  },
  size: { // Lưu lại size đã chọn
    type: String,
    required: true, // Hoặc false tùy SP
  },
}, { _id: true }); // Cho phép _id cho order item nếu cần tham chiếu


// --- Sub-schema cho Địa chỉ Giao hàng ---
const shippingAddressSchema = new mongoose.Schema({
    fullName: { type: String, required: [true, 'Vui lòng nhập họ tên người nhận'] },
    address1: { type: String, required: [true, 'Vui lòng nhập địa chỉ chi tiết'] },
    address2: { type: String, default: '' }, // Địa chỉ phụ
    city: { type: String, required: [true, 'Vui lòng nhập thành phố/tỉnh'] },
    postalCode: { type: String, required: [true, 'Vui lòng nhập mã bưu chính/zipcode'] },
    country: { type: String, required: [true, 'Vui lòng nhập quốc gia'] },
    phone: { type: String, required: [true, 'Vui lòng nhập số điện thoại'] },
}, { _id: false }); // Không cần _id riêng


// --- Sub-schema cho Kết quả Thanh toán Online ---
const paymentResultSchema = new mongoose.Schema({
    id: { type: String }, // Transaction ID từ cổng thanh toán
    status: { type: String }, // Trạng thái từ cổng thanh toán
    update_time: { type: String }, // Thời gian cập nhật từ cổng thanh toán
    email_address: { type: String }, // Email người trả tiền
    
    // ZaloPay specific fields
    app_trans_id: { type: String }, // ZaloPay app_trans_id
    zp_trans_id: { type: String },  // ZaloPay zp_trans_id
    order_url: { type: String },    // ZaloPay payment URL
}, { _id: false }); // Không cần _id riêng


// --- Schema chính cho Đơn hàng ---
const orderSchema = new mongoose.Schema(
  {
    user: { // Người dùng đặt hàng
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderItems: [orderItemSchema], // Mảng sản phẩm trong đơn
    shippingAddress: { // Địa chỉ giao hàng
      type: shippingAddressSchema,
      required: true,
    },
    paymentMethod: { // Phương thức thanh toán
      type: String,
      required: [true, 'Vui lòng chọn phương thức thanh toán'],
      enum: ['COD', 'Card', 'PayPal', 'Momo', 'VNPay', 'ZaloPay'], // Ví dụ các phương thức
      default: 'COD',
    },
    paymentResult: { // Kết quả thanh toán (nếu dùng cổng online)
      type: paymentResultSchema,
    },
    // --- Tổng kết giá trị đơn hàng ---
    itemsPrice: { // Tổng giá trị các sản phẩm (trước ship, tax)
      type: Number,
      required: true,
      default: 0.0,
    },
    shippingPrice: { // Phí vận chuyển
      type: Number,
      required: true,
      default: 0.0,
    },
    taxPrice: { // Thuế (nếu có)
      type: Number,
      required: true,
      default: 0.0,
    },
    totalPrice: { // Tổng cộng cuối cùng
      type: Number,
      required: true,
      default: 0.0,
    },
    // --- Trạng thái đơn hàng ---
    orderStatus: {
      type: String,
      required: true,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Failed'],
      default: 'Pending',
      index: true,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    paidAt: { type: Date },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    deliveredAt: { type: Date },
    // --- Thông tin bổ sung ---
    notes: { // Ghi chú của khách hàng
      type: String,
      trim: true,
      default: '',
    },
    // trackingNumber: { type: String } // Mã vận đơn (cập nhật khi giao hàng)
  },
  {
    timestamps: true, // createdAt, updatedAt cho đơn hàng
  }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
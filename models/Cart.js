// models/Cart.js
const mongoose = require('mongoose');

// Schema cho từng item trong giỏ hàng
const cartItemSchema = new mongoose.Schema({
  product: { // Tham chiếu đến sản phẩm
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Số lượng phải ít nhất là 1'],
    default: 1,
  },
  size: { // Lưu tham chiếu đến size người dùng chọn
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Size', // Tham chiếu đến Size model
    required: [true, 'Vui lòng chọn size cho sản phẩm trong giỏ hàng'],
  },
  // Lưu ý: Không lưu price, name, image ở đây.
  // Chúng sẽ được lấy (populate) từ Product model khi hiển thị giỏ hàng
  // để đảm bảo giá và thông tin luôn cập nhật.
}, { _id: false }); // Không cần _id riêng cho từng cart item

// Schema chính cho Giỏ hàng
const cartSchema = new mongoose.Schema(
  {
    user: { // Người dùng sở hữu giỏ hàng này
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // Mỗi user chỉ có một giỏ hàng
      index: true,
    },
    items: [cartItemSchema], // Mảng các sản phẩm trong giỏ
    // Có thể thêm các trường khác nếu cần, ví dụ: couponCodeApplied
  },
  {
    timestamps: true, // createdAt, updatedAt cho giỏ hàng (biết lần cuối cập nhật)
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// --- Virtual property để tính tổng số lượng sản phẩm trong giỏ (ví dụ) ---
cartSchema.virtual('totalQuantity').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// --- Virtual property để tính tổng tiền TẠM TÍNH (cần populate price) ---
// Lưu ý: Virtual này chỉ tính đúng khi bạn đã populate 'items.product'
// cartSchema.virtual('subtotal').get(function() {
//   return this.items.reduce((total, item) => {
//     // Cần kiểm tra item.product và item.product.price tồn tại
//     if (item.product && typeof item.product.price === 'number') {
//        // Nên tính giá sau giảm giá nếu có
//        const price = item.product.discountedPrice || item.product.price;
//        return total + item.quantity * price;
//     }
//     return total;
//   }, 0);
// });


const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
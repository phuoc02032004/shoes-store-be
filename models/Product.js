// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên sản phẩm'],
      trim: true,
      index: true, // Index cho tìm kiếm/sắp xếp theo tên
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Vui lòng nhập giá sản phẩm'],
      min: [0, 'Giá sản phẩm không thể âm'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category', 
      required: [true, 'Vui lòng chọn danh mục sản phẩm'],
    },
    // --- Trường lưu trữ ảnh từ Cloudinary ---
    image: {
      type: String, // URL ảnh trả về từ Cloudinary
      required: [true, 'Vui lòng cung cấp URL ảnh sản phẩm'],
    },
    imagePublicId: {
      type: String, // Public ID để quản lý (xóa/cập nhật) trên Cloudinary
      required: [true, 'Thiếu thông tin Cloudinary Public ID'],
      // select: false // Có thể ẩn nếu không muốn trả về client mặc định
    },
    // --- Kết thúc trường ảnh ---
    rating: {
      type: String, // Hoặc Number nếu tính toán trung bình
      // default: 0,
    },
    stock: {
      type: Number,
      required: [true, 'Vui lòng nhập số lượng tồn kho'],
      default: 0,
      min: [0, 'Số lượng tồn kho không thể âm'],
    },
    isNew: {
      type: Boolean,
      default: false,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isOnSale: {
      type: Boolean,
      default: false,
    },
    discount: {
      // Tỷ lệ giảm giá (ví dụ: 10 cho 10%, 0 nếu không giảm)
      type: Number,
      default: 0,
      min: [0, 'Giảm giá không thể âm'],
      max: [100, 'Giảm giá không thể lớn hơn 100%'],
    },
    brand: {
      type: String,
      trim: true,
      index: true, // Index cho lọc theo brand
    },
    color: {
      type: String,
      trim: true,
    },
    sizes: [ // Renamed from 'size' to 'sizes' as it's an array of references
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Size', // Reference the Size model
      }
    ],
    material: {
      type: String,
      trim: true,
    },
    // showShopNow không nên lưu ở DB, đây là logic hiển thị Frontend
    // discountedPrice sẽ dùng virtual property
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
    toJSON: { virtuals: true }, // Bao gồm virtuals khi chuyển sang JSON
    toObject: { virtuals: true }, // Bao gồm virtuals khi chuyển sang Object
  }
);

// --- Virtual property để tính giá sau giảm giá ---
productSchema.virtual('discountedPrice').get(function () {
  if (this.isOnSale && this.discount > 0 && this.price) {
    const finalPrice = this.price * (1 - this.discount / 100);
    return parseFloat(finalPrice.toFixed(2)); // Trả về số (có thể cần format lại ở FE)
  }
  return this.price; // Nếu không giảm giá, trả về giá gốc
});

// --- Indexes tổng hợp (tùy chọn, cải thiện hiệu năng query phức tạp) ---
// productSchema.index({ price: 1, category: 1 });
// productSchema.index({ name: 'text', description: 'text' }); // Index cho tìm kiếm text

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: { // Sản phẩm được đánh giá
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Đánh giá phải thuộc về một sản phẩm.'],
      index: true, // Index để lấy nhanh các review của một sản phẩm
    },
    user: { // Người dùng viết đánh giá
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Đánh giá phải được viết bởi một người dùng.'],
      index: true,
    },
    rating: { // Điểm đánh giá
      type: Number,
      required: [true, 'Vui lòng cung cấp điểm đánh giá.'],
      min: [1, 'Điểm đánh giá thấp nhất là 1'],
      max: [5, 'Điểm đánh giá cao nhất là 5'],
    },
    comment: { // Nội dung bình luận
      type: String,
      required: [true, 'Vui lòng nhập nội dung bình luận.'],
      trim: true,
      maxlength: [1000, 'Nội dung bình luận không quá 1000 ký tự.'],
    },
    // Có thể thêm: isApproved (nếu cần duyệt review), replies ([replySchema]),...
  },
  {
    timestamps: true, // createdAt, updatedAt cho review
  }
);

// --- Đảm bảo một người dùng chỉ đánh giá một sản phẩm một lần ---
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// --- (Tùy chọn) Static method để tính rating trung bình và cập nhật vào Product ---
// reviewSchema.statics.calculateAverageRating = async function(productId) {
//   try {
//     const stats = await this.aggregate([
//       {
//         $match: { product: productId } // Lọc các review của sản phẩm này
//       },
//       {
//         $group: {
//           _id: '$product',
//           numRatings: { $sum: 1 }, // Đếm số lượng đánh giá
//           avgRating: { $avg: '$rating' } // Tính rating trung bình
//         }
//       }
//     ]);

//     // console.log(`Rating stats for product ${productId}:`, stats);

//     if (stats.length > 0) {
//       // Cập nhật vào Product model
//       await mongoose.model('Product').findByIdAndUpdate(productId, {
//         rating: stats[0].avgRating.toFixed(1), // Làm tròn 1 chữ số thập phân
//         // numReviews: stats[0].numRatings // Có thể thêm trường số lượng reviews
//       });
//     } else {
//       // Nếu không còn review nào, đặt lại rating về 0 hoặc giá trị mặc định
//       await mongoose.model('Product').findByIdAndUpdate(productId, {
//         rating: '0', // Hoặc giá trị mặc định
//         // numReviews: 0
//       });
//     }
//   } catch (err) {
//     console.error(`Error calculating average rating for product ${productId}:`, err);
//   }
// };

// // --- Middleware: Gọi hàm tính rating trung bình sau khi LƯU review ---
// reviewSchema.post('save', function() {
//   // 'this' trỏ đến review vừa được lưu
//   // 'this.constructor' trỏ đến Review model
//   this.constructor.calculateAverageRating(this.product);
// });

// // --- Middleware: Gọi hàm tính rating trung bình sau khi XÓA review ---
// // Dùng pre('deleteOne') hoặc pre('findOneAndDelete') tùy thuộc vào cách bạn xóa
// // Lưu ý: Cần query document trước khi xóa để lấy productId
// reviewSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
//   // 'this' trỏ đến document sắp bị xóa
//   this.productIdForRatingUpdate = this.product; // Lưu tạm productId
//   next();
// });

// reviewSchema.post('deleteOne', { document: true, query: false }, async function() {
//   if (this.productIdForRatingUpdate) {
//      await this.model('Review').calculateAverageRating(this.productIdForRatingUpdate);
//   }
// });


const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
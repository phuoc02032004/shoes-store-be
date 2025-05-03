// models/Category.js
const mongoose = require('mongoose');
// const slugify = require('slugify'); // Cài đặt: npm install slugify

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên danh mục'],
      unique: true, // Tên danh mục thường là duy nhất
      trim: true,
      maxlength: [100, 'Tên danh mục không được vượt quá 100 ký tự'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      // index: true, // Tự động tạo index nếu cần query nhiều theo slug
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Mô tả danh mục không được vượt quá 500 ký tự'],
    },
    image: {
      type: String, // URL ảnh đại diện cho danh mục (tùy chọn)
    },
    // Danh mục cha (cho cấu trúc đa cấp)
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    isActive: {
      type: Boolean,
      default: true, // Mặc định là hoạt động
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// --- Middleware: Tự động tạo slug từ name trước khi lưu ---
// Cần cài 'slugify': npm install slugify
// categorySchema.pre('save', function (next) {
//   if (!this.isModified('name')) {
//     return next();
//   }
//   this.slug = slugify(this.name, { lower: true, strict: true });
//   next();
// });

// Virtual property để lấy các danh mục con
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory',
  justOne: false
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
// models/Size.js
const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Vui lòng chọn danh mục (men, women, kids)'],
    enum: ['men', 'women', 'kids'],
    trim: true,
  },
  system: {
    type: String,
    required: [true, 'Vui lòng chọn hệ thống size (EU, US, UK, CM, Standard)'],
    enum: ['EU', 'US', 'UK', 'CM', 'Standard'],
    trim: true,
  },
  value: {
    type: String,
    required: [true, 'Vui lòng nhập giá trị size'],
    trim: true,
  },
}, {
  timestamps: true,
});

const Size = mongoose.model('Size', sizeSchema);

module.exports = Size;
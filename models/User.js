// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Vui lòng nhập email'],
      unique: true, // Đảm bảo email là duy nhất
      match: [
        // Regex kiểm tra định dạng email cơ bản
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Vui lòng nhập địa chỉ email hợp lệ',
      ],
      lowercase: true, // Lưu email dưới dạng chữ thường
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Vui lòng nhập mật khẩu'],
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
      select: false, // Không tự động trả về trường password khi query user
    },
    role: {
      type: String,
      enum: ['user', 'admin'], // Các quyền có thể có
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false, // Mặc định là chưa xác thực khi đăng ký
    },
    verificationOtp: {
        type: String, // Lưu mã OTP đã được hash
        select: false, // Không trả về OTP hash khi query user
    },
    verificationOtpExpire: {
        type: Date,
        select: false, // Không trả về thời gian hết hạn OTP
    },
    // Có thể thêm các trường khác: resetPasswordToken, resetPasswordExpire,...
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  }
);

// --- Middleware (Hook) của Mongoose: Hash mật khẩu TRƯỚC KHI lưu ---
userSchema.pre('save', async function (next) {
  // Chỉ hash mật khẩu nếu nó đã được thay đổi (hoặc là user mới)
  // 'this' ở đây tham chiếu đến document user sắp được lưu
  if (!this.isModified('password')) {
    // Nếu mật khẩu không thay đổi (ví dụ: khi cập nhật email, xác thực OTP,...),
    // thì bỏ qua bước hash và đi tiếp.
    return next();
  }

  // Nếu mật khẩu CÓ thay đổi (hoặc là user mới), tiến hành hash
  try {
    console.log(`[User Model - pre('save')] Hashing password for user: ${this.email}`);
    const salt = await bcrypt.genSalt(10); // Tạo salt
    this.password = await bcrypt.hash(this.password, salt); // Hash mật khẩu và gán lại vào document
    next(); // Đi tiếp quá trình save
  } catch (error) {
    console.error('[User Model - pre(\'save\')] Error hashing password:', error);
    next(error); // Báo lỗi cho Mongoose nếu có lỗi khi hash
  }
});

// --- Method trên Schema: So sánh mật khẩu nhập vào với mật khẩu đã hash ---
userSchema.methods.matchPassword = async function (enteredPassword) {
  // 'this.password' ở đây là mật khẩu ĐÃ HASH lấy từ document user
  if (!this.password) return false; // Đảm bảo password tồn tại trước khi so sánh
  return await bcrypt.compare(enteredPassword, this.password);
};

// --- Method trên Schema: Tạo JWT ---
userSchema.methods.getSignedJwtToken = function () {
  const payload = {
    id: this._id,
    role: this.role,
    // Có thể thêm email hoặc name nếu cần, nhưng giữ payload nhỏ gọn là tốt
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d', // Lấy từ env hoặc mặc định
  });
};

// --- Method trên Schema: Tạo và hash mã OTP xác thực email ---
userSchema.methods.getVerificationOtp = function () {
  // 1. Tạo mã OTP gốc (ví dụ: 6 chữ số)
  const otpLength = 6;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 2. Hash mã OTP này để lưu vào DB
  // Gán trực tiếp vào các trường của document hiện tại ('this')
  this.verificationOtp = crypto
    .createHash('sha256')
    .update(otp) // Hash mã OTP gốc
    .digest('hex');

  // 3. Set thời gian hết hạn (ví dụ: 10 phút từ bây giờ)
  const minutesExpire = parseInt(process.env.EMAIL_VERIFY_TOKEN_EXPIRE || '10', 10);
  this.verificationOtpExpire = Date.now() + minutesExpire * 60 * 1000;

  console.log(`[User Model - getVerificationOtp] Generated OTP for ${this.email}: ${otp} (Hashed: ${this.verificationOtp}, Expires: ${new Date(this.verificationOtpExpire).toLocaleTimeString()})`);

  // 4. Trả về mã OTP gốc (chưa hash) để gửi trong email
  return otp;
};

const User = mongoose.model('User', userSchema);

module.exports = User;